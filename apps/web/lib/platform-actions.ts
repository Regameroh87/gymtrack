"use server";

// Server actions de plataforma: invalidar el cache de la landing pública tras
// cambiar algo que la alimenta (kill switch de registros, días/precio del plan).

// Next
import { revalidatePath } from "next/cache";

// La landing (app/page.tsx) es ISR (revalidate=300). Sin esto, el toggle del
// super_admin tarda hasta ~5 min en verse. revalidatePath fuerza que el próximo
// request regenere la página. Solo regenera una página pública → sin datos
// sensibles, no requiere gating.
export async function revalidateLanding(): Promise<void> {
  revalidatePath("/");
}
