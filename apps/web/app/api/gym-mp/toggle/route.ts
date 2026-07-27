// POST /api/gym-mp/toggle  { gym_id, enabled }
//
// Prende o apaga los cobros online del gimnasio. Es lo que la app móvil lee
// para decidir si le muestra el botón de pagar al socio.
//
// Va con service role y no con la sesión del owner porque la RLS de `gyms` solo
// habilita UPDATE a is_platform_admin (política gyms_update): el dueño puede ver
// su gym pero no escribirlo. El permiso se valida en la app, igual que hace
// /api/saas/checkout antes de escribir gym_saas_subscriptions.
//
// Prender sin cuenta conectada lo rechaza la base (trigger
// gyms_online_payments_need_account), no esta ruta. Acá solo se traduce el error
// a algo que la UI pueda mostrar: la regla vive en un solo lugar.

import { NextResponse } from "next/server";

import { requireGymOwner } from "@/lib/gym-mp/authz";
import { getServiceClient } from "@/lib/gym-mp/credentials";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { gym_id: gymId, enabled } = await req.json();

    if (!gymId) {
      return NextResponse.json({ error: "gym_id requerido" }, { status: 400 });
    }
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled debe ser booleano" }, { status: 400 });
    }

    const auth = await requireGymOwner(gymId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { error } = await getServiceClient()
      .from("gyms")
      .update({ online_payments_enabled: enabled })
      .eq("id", gymId);

    if (error) {
      // El trigger de la base es la única fuente de esta regla. Se lo reconoce
      // por el mensaje porque PostgREST no propaga un código distinguible para
      // un raise exception de plpgsql.
      if (error.message.includes("sin una cuenta de MercadoPago conectada")) {
        return NextResponse.json(
          {
            error:
              "Conectá tu cuenta de MercadoPago antes de habilitar los cobros online.",
          },
          { status: 409 },
        );
      }
      throw error;
    }

    console.log(
      `[gym-mp/toggle] gym ${gymId}: cobros online ${enabled ? "habilitados" : "deshabilitados"}`,
    );

    return NextResponse.json({ online_payments_enabled: enabled });
  } catch (err: unknown) {
    console.error("[gym-mp/toggle] Error interno:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
