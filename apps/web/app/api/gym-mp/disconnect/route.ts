// POST /api/gym-mp/disconnect  { gym_id }
//
// Desconecta la cuenta de MercadoPago del gimnasio: borra los tokens de Vault,
// marca la fila como revocada y apaga los cobros online.
//
// Las tres cosas las hace el RPC gym_mp_revoke en una sola transacción, y eso
// es a propósito: si el borrado del secreto y el apagado del interruptor fueran
// dos pasos separados desde acá, un error entre medio dejaría al gym con los
// cobros prendidos y sin token — o con el token vivo después de haber pedido
// desconectarse.

import { NextResponse } from "next/server";

import { requireGymOwner } from "@/lib/gym-mp/authz";
import { getServiceClient, revokeCredentials } from "@/lib/gym-mp/credentials";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { gym_id: gymId } = await req.json();
    if (!gymId) {
      return NextResponse.json({ error: "gym_id requerido" }, { status: 400 });
    }

    const auth = await requireGymOwner(gymId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await revokeCredentials(getServiceClient(), gymId);

    console.log(`[gym-mp/disconnect] gym ${gymId} desconectó su cuenta de MP`);

    return NextResponse.json({ connected: false, online_payments_enabled: false });
  } catch (err: unknown) {
    console.error("[gym-mp/disconnect] Error interno:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
