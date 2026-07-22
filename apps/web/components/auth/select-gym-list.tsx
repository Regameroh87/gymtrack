"use client";

// Selector de gym (multi-gym / modo administrador). Lista las opciones resueltas
// por el servidor (gymOptions) y al elegir persiste el gym y entra al panel.
// Solo son seleccionables los gyms donde la persona es staff (o cualquiera, si
// es super_admin); un socio ve el aviso de usar la app mobile.

// Contextos y helpers
import { useAuth } from "@/components/auth/auth-provider";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { isStaffRole, ROLE_LABELS } from "@/lib/auth/roles";
import { APP_URL } from "@/lib/site";

export function SelectGymList({
  signupEnabled = false,
}: {
  signupEnabled?: boolean;
}) {
  const { signOut } = useAuth();
  const { gymOptions, isSuperAdmin, switchGym } = useActiveGym();

  const selectable = gymOptions.filter(
    (o) => isSuperAdmin || isStaffRole(o.role)
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-jakarta text-2xl font-bold text-gray-900">
          Elegí un gimnasio
        </h1>
        <p className="text-sm text-gray-500">
          {isSuperAdmin
            ? "Entrá a cualquier gimnasio para administrarlo."
            : "Tenés acceso a más de un gimnasio."}
        </p>
      </div>

      {selectable.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No tenés gimnasios para administrar desde la web. Si sos socio, usá la{" "}
          <a
            href={APP_URL}
            className="font-medium text-brandPrimary-700 underline-offset-2 hover:underline"
          >
            app mobile
          </a>
          .
          {signupEnabled && (
            <p className="mt-3">
              ¿Tenés tu propio gimnasio o entrenás alumnos?{" "}
              <a
                href="/registro"
                className="font-medium text-brandPrimary-700 underline-offset-2 hover:underline"
              >
                Crealo gratis acá
              </a>
              .
            </p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {selectable.map((o) => (
            <li key={o.key}>
              <button
                type="button"
                onClick={() => switchGym(o.gym_id)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-brandPrimary-700 hover:shadow-sm"
              >
                <span className="font-medium text-gray-900">
                  {o.gym?.name ?? "Gimnasio"}
                </span>
                <span className="text-xs font-medium text-gray-400">
                  {ROLE_LABELS[o.role] ?? o.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={signOut}
        className="self-center text-xs text-gray-400 underline-offset-2 hover:underline"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
