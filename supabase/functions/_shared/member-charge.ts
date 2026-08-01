// Cobro de la cuota de un socio: intento + preferencia de MercadoPago.
//
// Extraído de crear-cobro-socio (que hasta ahora era el único caller) porque
// cobranza-recordatorios necesita exactamente lo mismo: los helpers de payer,
// el insert del intent + items congelados, y el POST a /checkout/preferences.
// Duplicar esto en dos edge functions las habría hecho divergir la primera vez
// que alguien tocara una sin acordarse de la otra.
//
// ── Qué se movió y qué no ────────────────────────────────────────────────────
// SÍ: armar el intent, congelar el desglose, construir el payer, crear la
// preferencia en MP. Es la parte mecánica, idéntica para cualquier caller.
//
// NO: la renovación del token (needsRefresh/refreshGymToken de mp-oauth.ts).
// Cada caller resuelve su accessToken ANTES de llamar acá, porque el criterio
// de cuándo vale la pena renovar es distinto según quién llama (crear-cobro-socio
// lo hace recién después de descartar los caminos que ni siquiera llegan a
// cobrar; el job de cobranza lo hace por gym, una vez, antes de recorrer a
// todos sus deudores).
//
// NO: validar que haya algo que cobrar (lista vacía, total en cero). El
// mensaje de error que le corresponde a esa validación es distinto en cada
// contexto (un socio pidiendo su propio cobro vs. un job que ya filtró
// deudores por gym_dunning_candidates), así que se queda en cada caller.
// Precondición de este módulo: `charges` no vacío y con total > 0.

// deno-lint-ignore-file no-explicit-any

const MP_API = 'https://api.mercadopago.com'

export interface PendingCharge {
  subscription_id: string
  activity_id: string
  activity_name: string
  plan_label: string | null
  amount: number
  period_start: string
  period_end: string
}

export interface MemberChargeProfile {
  id: string
  name: string | null
  last_name: string | null
  email: string
  phone: string | null
  document_number: string | null
  address: string | null
}

export interface CreateMemberChargeParams {
  /** Cliente con service role: el intent, los items y la preferencia se tocan sin RLS. */
  admin: any
  gymId: string
  gymName: string
  profile: MemberChargeProfile
  /** No vacío, con total > 0. El caller lo garantiza (ver comentario arriba). */
  charges: PendingCharge[]
  /** Token OAuth vigente del gym, ya resuelto (y renovado si hacía falta) por el caller. */
  accessToken: string
  /** URL pública de mp-gym-webhook. Sin ella no se crea la preferencia. */
  webhookUrl: string | undefined
  /** A dónde vuelve quien paga: deep link en la app, página web desde un mail. */
  backUrl: string
  /**
   * Vigencia del link en días. Sin este parámetro la preferencia no expira
   * (caso app: el socio la genera y la usa en el momento). El mail de
   * cobranza SÍ lo usa: un link de hace tres meses no puede cobrarle de golpe
   * una cuota que ya se pagó a mano.
   */
  expiresInDays?: number
}

export interface MemberChargeResult {
  intentId: string
  initPoint: string
}

export type MemberChargeFailureReason =
  | 'webhook_not_configured'
  | 'mp_rejected'
  | 'mp_missing_init_point'

/**
 * Falla de negocio al crear el cobro (no un bug): el caller decide qué status
 * HTTP devolver o cómo anotarla en su log. En todos los casos el intent ya
 * quedó marcado 'expired' antes de lanzar — nunca se deja un intent 'pending'
 * sin preferencia detrás.
 */
export class MemberChargeError extends Error {
  constructor(readonly reason: MemberChargeFailureReason, message: string) {
    super(message)
    this.name = 'MemberChargeError'
  }
}

// ── Datos del pagador ────────────────────────────────────────────────────────
// Todo lo que sigue existe para el motor antifraude de MercadoPago: cuanto más
// completo va el objeto `payer`, menos pagos legítimos rechaza (está en su
// checklist de calidad, como buena práctica).
//
// La regla común a los tres helpers: ante la duda, NO mandar el campo. Los tres
// leen columnas de texto libre que carga el staff a mano, y un dato mal armado
// es peor que la ausencia del dato — el motor lo cruza contra el titular de la
// tarjeta y una discrepancia cuenta en contra.

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** "julio 2026" a partir de un date ISO (YYYY-MM-DD). */
export function monthLabel(iso: string | null): string {
  const [y, m] = (iso ?? '').split('-')
  const name = MONTHS_ES[Number(m) - 1]
  return name ? `${name} ${y}` : ''
}

const onlyDigits = (s: string) => s.replace(/\D/g, '')

/**
 * Documento del socio. Se manda solo cuando la longitud es inequívoca: 7-8
 * dígitos es DNI, 11 es CUIL. Cualquier otra cosa queda afuera.
 */
export function buildIdentification(raw: string | null) {
  const n = onlyDigits(raw ?? '')
  if (n.length === 7 || n.length === 8) return { type: 'DNI', number: n }
  if (n.length === 11) return { type: 'CUIL', number: n }
  return undefined
}

/**
 * Teléfono normalizado. Se sacan el prefijo de país, el 9 de celular y el 0 de
 * larga distancia (ningún número argentino de 10 dígitos empieza con 9 ni 0,
 * así que sacarlos no puede comerse un dígito válido), y el 15 viejo de los
 * celulares del AMBA, que aparece seguido en datos cargados a mano.
 *
 * Después queda un solo criterio: un número argentino normalizado tiene
 * exactamente 10 dígitos (área + abonado). Si no da 10, es que no entendimos lo
 * que el staff escribió y no se manda nada — un teléfono con un 15 de más no es
 * un teléfono, y mandarlo le resta al perfil en vez de sumarle.
 *
 * El área se separa SOLO en el caso inequívoco: AMBA, 11 + 8 dígitos. Los demás
 * códigos de área argentinos son de 2, 3 o 4 dígitos y no se distinguen mirando
 * el número, así que en vez de partirlo mal van los 10 juntos en `number`. MP
 * acepta el objeto sin `area_code`.
 */
export function buildPhone(raw: string | null) {
  let n = onlyDigits(raw ?? '')
  if (n.startsWith('54')) n = n.slice(2)
  if (n.startsWith('9')) n = n.slice(1)
  if (n.startsWith('0')) n = n.slice(1)
  if (n.startsWith('1115') && n.length === 12) n = '11' + n.slice(4)
  if (n.length !== 10) return undefined
  if (n.startsWith('11')) return { area_code: '11', number: n.slice(2) }
  return { number: n }
}

/**
 * profiles.address es una línea suelta, no está desagregada en calle / número /
 * CP. Va entera como street_name y los otros dos campos quedan sin completar:
 * MP acepta la dirección parcial, e inventar un número o un código postal sería
 * exactamente el tipo de dato falso que conviene no mandar.
 */
export function buildAddress(raw: string | null) {
  const street = (raw ?? '').trim()
  return street ? { street_name: street.slice(0, 255) } : undefined
}

/** Marca el intent como expirado. Best-effort: si esto falla no hay mucho más para hacer. */
async function expireIntent(admin: any, intentId: string) {
  await admin.from('member_payment_intents').update({ status: 'expired' }).eq('id', intentId)
}

export async function createMemberCharge(
  params: CreateMemberChargeParams,
): Promise<MemberChargeResult> {
  const { admin, gymId, gymName, profile, charges, accessToken, webhookUrl, backUrl, expiresInDays } = params
  const total = charges.reduce((sum, c) => sum + Number(c.amount), 0)

  // ── Intento + desglose congelado ────────────────────────────────────────
  const { data: intent, error: intentError } = await admin
    .from('member_payment_intents')
    .insert({ gym_id: gymId, user_id: profile.id, total_amount: total })
    .select('id')
    .single()

  if (intentError) throw intentError

  const { error: itemsError } = await admin
    .from('member_payment_intent_items')
    .insert(charges.map((c) => ({
      intent_id: intent.id,
      subscription_id: c.subscription_id,
      activity_id: c.activity_id,
      amount: c.amount,
      period_start: c.period_start,
      period_end: c.period_end,
    })))

  // Sin items el intento no sirve para nada: el RPC de registro lo rechaza a
  // propósito (no habría a qué imputar el pago). Se marca expirado y se corta
  // ANTES de crear la preferencia, para no dejar un link que cobre plata que
  // después nadie pueda registrar.
  if (itemsError) {
    await expireIntent(admin, intent.id)
    throw itemsError
  }

  // Sin webhook el pago se cobra y nunca se registra. Es preferible no dejar
  // pagar a dejar a alguien pagando al vacío.
  if (!webhookUrl) {
    await expireIntent(admin, intent.id)
    throw new MemberChargeError('webhook_not_configured', 'MP_GYM_WEBHOOK_URL no configurada')
  }

  // ── Vigencia opcional del link ──────────────────────────────────────────
  const expiration = expiresInDays
    ? {
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
    }
    : {}

  // ── Preferencia en MercadoPago ───────────────────────────────────────────
  const mpRes = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Un item por actividad: así quien paga ve el detalle en el checkout de
      // MP y no un monto suelto que no sabe de dónde sale.
      items: charges.map((c) => ({
        id: c.subscription_id,
        title: c.plan_label ? `${c.activity_name} · ${c.plan_label}` : c.activity_name,
        description: [
          `Cuota de ${c.activity_name}`,
          monthLabel(c.period_start),
          gymName,
        ].filter(Boolean).join(' · '),
        // El listado de categorías está en
        // https://api.mercadopago.com/item_categories. Una cuota de gimnasio
        // es un servicio, no un producto físico.
        category_id: 'services',
        quantity: 1,
        unit_price: Number(c.amount),
        currency_id: 'ARS',
      })),
      // Los campos que devuelven undefined los descarta JSON.stringify, así
      // que un perfil sin teléfono ni documento cargado manda el payer mínimo
      // y el cobro sale igual.
      payer: {
        email: profile.email,
        name: profile.name ?? undefined,
        surname: profile.last_name ?? undefined,
        identification: buildIdentification(profile.document_number),
        phone: buildPhone(profile.phone),
        address: buildAddress(profile.address),
      },
      // El intent es lo que ata el pago de MP a nuestras filas. El webhook no
      // tiene otra forma de saber qué cuotas saldar.
      external_reference: intent.id,
      // A diferencia de /preapproval —que ignora notification_url y obliga a
      // configurar el webhook por aplicación— las preferencias sí lo aceptan.
      notification_url: webhookUrl,
      // Sin auto_return a propósito, en los dos casos que usan este módulo: un
      // deep link (gymtrack://) hace que MP rechace la preferencia entera si
      // se lo pasa (valida el parámetro contra http/https), y la página web de
      // vuelta del mail no necesita el auto-redirect — quien confirma el pago
      // es siempre el webhook, no el retorno del navegador.
      back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
      statement_descriptor: (gymName ?? 'GYM').slice(0, 22),
      ...expiration,
    }),
  })

  if (!mpRes.ok) {
    const detail = await mpRes.text()
    await expireIntent(admin, intent.id)
    throw new MemberChargeError(
      'mp_rejected',
      `MercadoPago ${mpRes.status} al crear la preferencia: ${detail.slice(0, 300)}`,
    )
  }

  const pref = await mpRes.json()
  const initPoint = pref.init_point ?? pref.sandbox_init_point

  if (!initPoint) {
    await expireIntent(admin, intent.id)
    throw new MemberChargeError('mp_missing_init_point', 'MercadoPago no devolvió init_point')
  }

  await admin
    .from('member_payment_intents')
    .update({ mp_preference_id: pref.id, init_point: initPoint })
    .eq('id', intent.id)

  return { intentId: intent.id, initPoint }
}
