// Tests de la validación de firma de los webhooks de MercadoPago.
//
// Correr con:  deno test supabase/functions/_shared/mp-signature.test.ts
//
// El módulo no importa nada de la red, así que estos tests corren offline —
// a diferencia de las funciones, que traen supabase-js de esm.sh.
//
// El caso que más importa es el último: sin secret configurado la firma NO se
// puede validar y el aviso se rechaza. Antes devolvía true, que dejaba los dos
// webhooks abiertos mientras los secrets no estuvieran cargados.

import { validateMpSignature } from './mp-signature.ts'

/**
 * Assert propio en vez de jsr:@std/assert.
 *
 * Todo lo que se prueba acá es booleano, así que la dependencia aportaría una
 * descarga y nada más — y sin ella el archivo corre sin red, que es lo que
 * permite tenerlo en CI sin depender de que jsr esté disponible.
 */
function assertEquals(actual: boolean, expected: boolean, msg?: string) {
  if (actual !== expected) {
    throw new Error(msg ?? `esperaba ${expected}, recibí ${actual}`)
  }
}

const SECRET = 'clave-de-prueba'
const DATA_ID = 'abc123'
const REQUEST_ID = 'req-987'
const TS = '1700000000'

/** El mismo HMAC que calcula la función, para armar avisos bien firmados. */
async function sign(manifest: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function buildRequest(v1: string, ts = TS, dataId = DATA_ID): Request {
  return new Request(`https://example.com/functions/v1/mp-webhook?data.id=${dataId}`, {
    method: 'POST',
    headers: {
      'x-signature': `ts=${ts},v1=${v1}`,
      'x-request-id': REQUEST_ID,
    },
  })
}

const MANIFEST = `id:${DATA_ID};request-id:${REQUEST_ID};ts:${TS};`

Deno.test('firma válida: acepta', async () => {
  const req = buildRequest(await sign(MANIFEST, SECRET))
  assertEquals(await validateMpSignature(req, SECRET), true)
})

Deno.test('firma calculada con otro secret: rechaza', async () => {
  const req = buildRequest(await sign(MANIFEST, 'otra-clave'))
  assertEquals(await validateMpSignature(req, SECRET), false)
})

Deno.test('hash alterado: rechaza', async () => {
  const valido = await sign(MANIFEST, SECRET)
  // Un solo carácter distinto alcanza.
  const alterado = (valido[0] === 'a' ? 'b' : 'a') + valido.slice(1)
  assertEquals(await validateMpSignature(buildRequest(alterado), SECRET), false)
})

Deno.test('data.id distinto del firmado: rechaza', async () => {
  // El manifest incluye el data.id: firmar un aviso y reusar la firma para otro
  // recurso tiene que fallar, o un aviso legítimo serviría para tocar la
  // suscripción de cualquier otro gym.
  const req = buildRequest(await sign(MANIFEST, SECRET), TS, 'otro-id')
  assertEquals(await validateMpSignature(req, SECRET), false)
})

Deno.test('header x-signature ausente o incompleto: rechaza', async () => {
  const sinHeader = new Request(`https://example.com/?data.id=${DATA_ID}`, { method: 'POST' })
  assertEquals(await validateMpSignature(sinHeader, SECRET), false)

  const soloTs = new Request(`https://example.com/?data.id=${DATA_ID}`, {
    method: 'POST',
    headers: { 'x-signature': `ts=${TS}` },
  })
  assertEquals(await validateMpSignature(soloTs, SECRET), false)
})

Deno.test('sin secret configurado: rechaza aunque la firma venga bien armada', async () => {
  // El caso que motivó el cambio: con el secret sin cargar en Edge Functions →
  // Secrets, la función devolvía true y procesaba cualquier POST.
  const req = buildRequest(await sign(MANIFEST, SECRET))
  assertEquals(await validateMpSignature(req, undefined), false)
  assertEquals(await validateMpSignature(req, ''), false)
})
