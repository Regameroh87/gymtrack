// Job diario de cobranza: recordatorios de cuota vencida por mail.
//
// Es el primer consumidor real del checkout de MercadoPago que ya está
// construido (crear-cobro-socio, mp-gym-webhook, gym_mp_accounts): hasta esta
// función, el socio que se atrasaba no se enteraba y el link de pago que ya
// sabemos generar nunca le llegaba a nadie.
//
// La dispara pg_cron una vez por día (ver bootstrap_env.sql, sección 5) contra
// TODOS los gyms con cobranza activa. Un gym que explota no puede frenar a los
// demás: try/catch por gym y por socio, con un resumen final en el log.
//
// ── El corazón de la idempotencia ────────────────────────────────────────────
// gym_dunning_log tiene un unique (gym_id, user_id, step_id, reference_due_date)
// que es la garantía real: si este job corre dos veces el mismo día (o se
// dispara a mano después de la corrida automática), la segunda vez no manda
// nada nuevo — cualquier fila previa para esa combinación, sea cual sea su
// status, cuenta como "ya cubierto". El cooldown de gym_dunning_settings es la
// red aparte para el caso borde de un pago parcial que corre reference_due_date
// hacia otro valor y generaría, técnicamente, una clave nueva — y por eso está
// acotado al MISMO step: la escalada a un step distinto nunca es un duplicado y
// el cooldown no la puede frenar.
//
// Variables de entorno requeridas:
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
//   INTERNAL_FUNCTION_SECRET – protege esta función Y es lo que se manda a
//                              send-email para poder mandar el mail real.
//   MP_GYM_WEBHOOK_URL       – sin esto ningún recordatorio lleva botón de
//                              pago (mismo motivo que en crear-cobro-socio).
// Opcionales:
//   MP_OAUTH_CLIENT_ID / MP_OAUTH_CLIENT_SECRET – renovar el token del gym acá
//                              mismo si está por vencer. Sin ellas, el link de
//                              pago sale igual con el token que haya.
//   APP_URL                  – base de la página de vuelta del checkout
//                              (default https://www.gymtrack.ar/pago/gracias).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { hasOAuthApp, needsRefresh, refreshGymToken } from '../_shared/mp-oauth.ts'
import { createMemberCharge, type PendingCharge } from '../_shared/member-charge.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const INTERNAL_SECRET = Deno.env.get('INTERNAL_FUNCTION_SECRET')
const APP_URL = (Deno.env.get('APP_URL') ?? 'https://www.gymtrack.ar').replace(/\/$/, '')

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

interface DunningCandidate {
  user_id: string
  email: string | null
  name: string | null
  last_name: string | null
  reference_due_date: string
  days_overdue: number
  total_amount: number
  items: number
}

interface DunningStep {
  id: string
  days_after_due: number
  subject: string
  heading: string
  body_text: string
  cta_label: string
  show_payment_button: boolean
}

// ── Formato de las variables del canvas ─────────────────────────────────────
// es-AR: "$ 15.000" y "22 de julio de 2026", como el resto del panel. La fecha
// se ancla a UTC porque reference_due_date es un `date` puro (sin hora): sin
// esto, un huso horario negativo (Argentina) corre la fecha un día para atrás.
const MONEY_FMT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})
const DATE_FMT = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const fmtMoney = (n: number) => MONEY_FMT.format(n)
const fmtDate = (iso: string) => DATE_FMT.format(new Date(`${iso}T00:00:00Z`))

/** Sustitución simple de {{variable}}. Documentada para el owner en el panel (lib/dunning-defaults.ts). */
function resolveVars(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value), text)
}

interface LogEntry {
  gymId: string
  userId: string
  stepId: string
  referenceDueDate: string
  daysAfterDue: number
  status: 'sent' | 'failed' | 'skipped'
  error?: string | null
  intentId?: string | null
}

async function logDunning(entry: LogEntry) {
  const { error } = await supabaseAdmin.from('gym_dunning_log').insert({
    gym_id: entry.gymId,
    user_id: entry.userId,
    step_id: entry.stepId,
    reference_due_date: entry.referenceDueDate,
    days_after_due: entry.daysAfterDue,
    status: entry.status,
    error: entry.error ?? null,
    intent_id: entry.intentId ?? null,
  })
  if (error) {
    // No hay mucho más para hacer: el mail (si salió) ya salió. Que quede en
    // los logs de la función para que alguien lo note.
    console.error(
      `[cobranza-recordatorios] no se pudo escribir gym_dunning_log (gym ${entry.gymId}, socio ${entry.userId}):`,
      error.message,
    )
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const internalSecret = INTERNAL_SECRET
  if (!internalSecret || req.headers.get('x-internal-secret') !== internalSecret) {
    return jsonResponse({ error: 'No autorizado.' }, 401)
  }

  const summary = { gyms: 0, sent: 0, skipped: 0, failed: 0 }
  const webhookUrl = Deno.env.get('MP_GYM_WEBHOOK_URL')

  // ── Gyms con la cobranza prendida ─────────────────────────────────────────
  const { data: settingsRows, error: settingsError } = await supabaseAdmin
    .from('gym_dunning_settings')
    .select('gym_id, cooldown_days, reply_to, gyms(id, name, is_active, online_payments_enabled)')
    .eq('enabled', true)

  if (settingsError) {
    console.error('[cobranza-recordatorios] no se pudo leer gym_dunning_settings:', settingsError.message)
    return jsonResponse({ error: 'No se pudo leer la configuración de cobranza.' }, 500)
  }

  for (const setting of settingsRows ?? []) {
    const gym = (Array.isArray(setting.gyms) ? setting.gyms[0] : setting.gyms) as
      | { id: string; name: string; is_active: boolean; online_payments_enabled: boolean }
      | null
    const gymId = setting.gym_id as string

    if (!gym) continue

    try {
      // ── Gates, con corte temprano ───────────────────────────────────────
      // Mismo criterio que crear-cobro-socio: un gym inactivo o que dejó de
      // pagar el abono no genera actividad nueva, aunque tenga la cobranza
      // configurada de antes.
      if (!gym.is_active) continue

      const { data: saasActive } = await supabaseAdmin.rpc('is_saas_subscription_active', { p_gym_id: gymId })
      if (saasActive === false) continue

      const { data: stepsRows, error: stepsError } = await supabaseAdmin
        .from('gym_dunning_steps')
        .select('id, days_after_due, subject, heading, body_text, cta_label, show_payment_button')
        .eq('gym_id', gymId)
        .eq('active', true)

      if (stepsError) throw stepsError
      const steps = (stepsRows ?? []) as DunningStep[]
      if (!steps.length) continue

      summary.gyms++

      // ── A quién le llegaría hoy, una sola vez por gym ────────────────────
      const { data: candidatesRows, error: candidatesError } = await supabaseAdmin
        .rpc('gym_dunning_candidates', { p_gym_id: gymId })

      if (candidatesError) throw candidatesError
      const candidates = (candidatesRows ?? []) as DunningCandidate[]
      if (!candidates.length) continue

      // Coincidencia EXACTA días de atraso ↔ days_after_due: el job corre a
      // diario y un rango haría que un mismo step se repitiera varios días.
      const stepByDays = new Map(steps.map((s) => [s.days_after_due, s]))
      const matched = candidates
        .map((candidate) => ({ candidate, step: stepByDays.get(candidate.days_overdue) }))
        .filter((m): m is { candidate: DunningCandidate; step: DunningStep } => !!m.step)

      if (!matched.length) continue

      const userIds = [...new Set(matched.map((m) => m.candidate.user_id))]

      // ── "Ya cubierto": cualquier fila previa para esa clave exacta ───────
      const { data: existingLogRows } = await supabaseAdmin
        .from('gym_dunning_log')
        .select('user_id, step_id, reference_due_date')
        .eq('gym_id', gymId)
        .in('user_id', userIds)
      const alreadyCovered = new Set(
        (existingLogRows ?? []).map((r) => `${r.user_id}|${r.step_id}|${r.reference_due_date}`),
      )

      // ── Cooldown: el MISMO recordatorio, de nuevo, hace muy poco ─────────
      // Clave por (socio, step) y no por socio solo. La diferencia es todo lo
      // que hace útil a este freno:
      //
      //   Mismo step otra vez  → es el rebote de un pago parcial (la fecha de
      //                          referencia se corrió, así que la idempotencia
      //                          por unique no lo reconoce). Es un duplicado
      //                          real y hay que frenarlo.
      //   Otro step            → es la escalada normal (día 10 → día 15). No es
      //                          un duplicado y NUNCA se frena.
      //
      // Con la clave por socio solo, un cooldown más grande que el salto entre
      // dos escalones se comía el segundo en silencio: con steps en 10 y 15 y
      // un cooldown de 7, el recordatorio del día 15 no salía nunca y quedaba
      // como 'skipped' sin que nadie lo notara. Ahora el cooldown es inocuo
      // para la escalada, valga lo que valga.
      const cooldownDays = (setting.cooldown_days as number) ?? 3
      const cooldownCutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString()
      const { data: recentSentRows } = await supabaseAdmin
        .from('gym_dunning_log')
        .select('user_id, step_id')
        .eq('gym_id', gymId)
        .eq('status', 'sent')
        .in('user_id', userIds)
        .gte('sent_at', cooldownCutoff)
      const recentlyNotified = new Set((recentSentRows ?? []).map((r) => `${r.user_id}|${r.step_id}`))

      // ── Credenciales de MP del gym, una sola vez (no por socio) ──────────
      // Sin esto el link de pago sale igual, solo que sin botón: es lo que
      // hace que el mail nunca se pierda por un problema de MercadoPago.
      let accessToken: string | null = null
      let mpUnavailableReason: string | null = null

      if (!gym.online_payments_enabled) {
        mpUnavailableReason = 'el gym tiene los cobros online deshabilitados'
      } else {
        const { data: credsRows } = await supabaseAdmin
          .rpc('gym_mp_get_credentials', { p_gym_id: gymId })
        const creds = Array.isArray(credsRows) ? credsRows[0] : credsRows

        if (!creds?.access_token) {
          mpUnavailableReason = 'el gym no tiene una cuenta de MercadoPago conectada'
        } else {
          accessToken = creds.access_token

          if (needsRefresh(creds.expires_at) && creds.refresh_token && hasOAuthApp()) {
            try {
              const renewed = await refreshGymToken(creds.refresh_token)
              await supabaseAdmin.rpc('gym_mp_store_credentials', {
                p_gym_id: gymId,
                p_mp_user_id: renewed.mpUserId,
                p_access_token: renewed.accessToken,
                p_refresh_token: renewed.refreshToken,
                p_public_key: renewed.publicKey,
                p_expires_at: renewed.expiresAt,
                p_live_mode: renewed.liveMode,
                p_connected_by: null,
              })
              accessToken = renewed.accessToken
            } catch (err) {
              // Igual que en crear-cobro-socio: si falla la renovación se sigue
              // con el token viejo, que dentro del margen de un día todavía
              // puede servir.
              console.error(
                `[cobranza-recordatorios] gym ${gymId}: no se pudo renovar el token:`,
                err instanceof Error ? err.message : err,
              )
            }
          }
        }
      }

      if (!webhookUrl) mpUnavailableReason = mpUnavailableReason ?? 'MP_GYM_WEBHOOK_URL no configurada'

      // ── Un mail por candidato ──────────────────────────────────────────────
      for (const { candidate, step } of matched) {
        const key = `${candidate.user_id}|${step.id}|${candidate.reference_due_date}`
        if (alreadyCovered.has(key)) continue // idempotencia: no se cuenta ni como skipped, ya está registrado

        if (!candidate.email) {
          await logDunning({
            gymId, userId: candidate.user_id, stepId: step.id,
            referenceDueDate: candidate.reference_due_date, daysAfterDue: step.days_after_due,
            status: 'skipped', error: 'El socio no tiene email cargado.',
          })
          summary.skipped++
          continue
        }

        if (recentlyNotified.has(`${candidate.user_id}|${step.id}`)) {
          await logDunning({
            gymId, userId: candidate.user_id, stepId: step.id,
            referenceDueDate: candidate.reference_due_date, daysAfterDue: step.days_after_due,
            status: 'skipped',
            error:
              `Cooldown activo: este mismo recordatorio (día ${step.days_after_due}) ya se le mandó ` +
              `hace menos de ${cooldownDays} día(s), probablemente porque un pago parcial corrió el ` +
              `vencimiento de referencia.`,
          })
          summary.skipped++
          continue
        }

        // ── Detalle de deuda (para el bloque del mail y para {{detalle}}) ──
        const { data: chargesRows } = await supabaseAdmin
          .rpc('member_pending_charges', { p_gym_id: gymId, p_user_id: candidate.user_id })
        const charges = (chargesRows ?? []) as PendingCharge[]
        const items = charges.map((c) => ({
          label: c.plan_label ? `${c.activity_name} · ${c.plan_label}` : c.activity_name,
          amount: fmtMoney(Number(c.amount)),
        }))
        const totalStr = fmtMoney(candidate.total_amount)

        // ── Link de pago, condicional ───────────────────────────────────────
        // Punto 5 del plan: solo si el step lo pide Y el gym tiene todo lo
        // necesario. Si algo falla acá, el recordatorio sale igual, sin botón
        // — no se pierde por un problema de MercadoPago.
        let payUrl: string | null = null
        let intentId: string | null = null
        let buttonNote: string | null = null

        if (step.show_payment_button) {
          if (accessToken && webhookUrl) {
            const chargesTotal = charges.reduce((sum, c) => sum + Number(c.amount), 0)
            if (charges.length && chargesTotal > 0) {
              try {
                const charge = await createMemberCharge({
                  admin: supabaseAdmin,
                  gymId,
                  gymName: gym.name,
                  profile: {
                    id: candidate.user_id,
                    name: candidate.name,
                    last_name: candidate.last_name,
                    email: candidate.email,
                    phone: null,
                    document_number: null,
                    address: null,
                  },
                  charges,
                  accessToken,
                  webhookUrl,
                  // Vuelve a una página web, no al deep link de la app: quien
                  // abre este link lo hace desde el mail, no desde el celular
                  // con GymTrack instalado necesariamente.
                  backUrl: `${APP_URL}/pago/gracias`,
                  // 7 días: un link de cobranza de hace tres meses no puede
                  // cobrar de golpe una cuota que ya se pagó a mano.
                  expiresInDays: 7,
                })
                payUrl = charge.initPoint
                intentId = charge.intentId
              } catch (err) {
                console.error(
                  `[cobranza-recordatorios] gym ${gymId} socio ${candidate.user_id}: no se pudo generar el link de pago:`,
                  err instanceof Error ? err.message : err,
                )
                buttonNote = 'no se pudo generar el link de pago'
              }
            }
          } else {
            buttonNote = mpUnavailableReason
          }
        }

        // ── Variables del canvas ────────────────────────────────────────────
        const vars: Record<string, string> = {
          nombre: candidate.name?.trim() || 'socio',
          gimnasio: gym.name ?? 'tu gimnasio',
          monto: totalStr,
          vencimiento: fmtDate(candidate.reference_due_date),
          dias_atraso: String(candidate.days_overdue),
          detalle: items.map((it) => `${it.label}: ${it.amount}`).join(' · '),
        }

        const subject = resolveVars(step.subject, vars)
        const heading = resolveVars(step.heading, vars)
        const bodyText = resolveVars(step.body_text, vars)
        const ctaLabel = resolveVars(step.cta_label, vars)

        // ── El mail de verdad, vía send-email ───────────────────────────────
        let sendOk = false
        let sendError: string | null = null
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              'x-internal-secret': internalSecret,
            },
            body: JSON.stringify({
              gym_id: gymId,
              to: candidate.email,
              type: 'dunning_reminder',
              subject,
              reply_to: setting.reply_to ?? undefined,
              data: {
                heading,
                body: bodyText,
                ctaLabel,
                payUrl,
                items,
                total: totalStr,
                dueDate: fmtDate(candidate.reference_due_date),
              },
            }),
          })
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            sendError = (errBody as { error?: string }).error ?? `send-email respondió ${res.status}`
          } else {
            sendOk = true
          }
        } catch (err) {
          sendError = err instanceof Error ? err.message : 'error de red al invocar send-email'
        }

        if (sendOk) {
          // buttonNote no es un error: el recordatorio salió igual, solo que
          // sin botón. Queda anotado para poder auditar por qué.
          await logDunning({
            gymId, userId: candidate.user_id, stepId: step.id,
            referenceDueDate: candidate.reference_due_date, daysAfterDue: step.days_after_due,
            status: 'sent',
            error: step.show_payment_button && !payUrl ? `Enviado sin botón de pago: ${buttonNote}.` : null,
            intentId,
          })
          summary.sent++
        } else {
          await logDunning({
            gymId, userId: candidate.user_id, stepId: step.id,
            referenceDueDate: candidate.reference_due_date, daysAfterDue: step.days_after_due,
            status: 'failed', error: sendError,
          })
          summary.failed++
        }
      }
    } catch (err) {
      // Un gym que explota (RPC caído, columna inesperada, lo que sea) no
      // puede frenar a los demás.
      console.error(
        `[cobranza-recordatorios] gym ${gymId}: error inesperado:`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  console.log('[cobranza-recordatorios] resumen:', JSON.stringify(summary))
  return jsonResponse(summary, 200)
})
