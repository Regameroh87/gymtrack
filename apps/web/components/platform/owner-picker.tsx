"use client";

// Selección del dueño de un gimnasio, compartida por el alta (new-gym-form) y
// la transferencia (edit-gym-form): toggle entre usuario existente y cuenta
// nueva, buscador sobre profiles y campos de alta. El estado vive en el form
// padre — este componente solo lo pinta, para que cada pantalla decida qué
// hacer con la selección (crear gym vs. transferir).

// React
import { useMemo, useState } from "react";

// Iconos
import { Mail, Phone, Search, ShieldHalf, X } from "lucide-react";

// Helpers y campos
import { ownerLabel, type OwnerCandidate } from "@/lib/gyms";
import { Field, Input } from "@/components/platform/gym-form-fields";

export type OwnerMode = "existing" | "new";

const OWNER_MODES: { value: OwnerMode; label: string }[] = [
  { value: "existing", label: "Usuario existente" },
  { value: "new", label: "Crear nuevo" },
];

export function OwnerPicker({
  owners,
  mode,
  onModeChange,
  selectedOwner,
  onSelectOwner,
  name,
  onNameChange,
  lastName,
  onLastNameChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  errors = {},
  existingHint,
}: {
  owners: OwnerCandidate[];
  mode: OwnerMode;
  onModeChange: (mode: OwnerMode) => void;
  selectedOwner: OwnerCandidate | null;
  onSelectOwner: (owner: OwnerCandidate | null) => void;
  name: string;
  onNameChange: (v: string) => void;
  lastName: string;
  onLastNameChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  errors?: Record<string, string>;
  existingHint?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = !q
      ? owners
      : owners.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.last_name?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q)
        );
    return rows.slice(0, 6);
  }, [owners, search]);

  return (
    <div className="flex flex-col gap-y-5">
      {/* Toggle existente / nuevo */}
      <div className="flex self-start rounded-xl bg-gray-50 p-1">
        {OWNER_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onModeChange(m.value)}
            className={`rounded-lg px-4 py-1.5 font-manrope text-[12px] ${
              mode === m.value
                ? "bg-white font-bold text-brandPrimary-700 shadow-sm"
                : "font-semibold text-gray-400"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "existing" ? (
        <Field label="Dueño" hint={existingHint} error={errors.owner}>
          {selectedOwner ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-brandPrimary-300 bg-brandPrimary-50 px-3.5 py-2.5">
              <ShieldHalf size={15} className="text-brandPrimary-700" />
              <span className="flex-1 font-manrope text-[13px] font-semibold text-gray-900">
                {ownerLabel(selectedOwner)}
                <span className="font-normal text-gray-400">
                  {"  ·  "}
                  {selectedOwner.email}
                </span>
              </span>
              <button type="button" onClick={() => onSelectOwner(null)}>
                <X size={14} className="text-gray-400" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
                <Search size={15} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setOpen(true)}
                  placeholder="Buscar usuario por nombre o email..."
                  className="flex-1 bg-transparent font-manrope text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>

              {open && options.length > 0 && (
                <div className="mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {options.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelectOwner(p);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 border-b border-gray-100 px-3.5 py-2.5 text-left transition last:border-b-0 hover:bg-brandPrimary-50"
                    >
                      <div className="flex-1">
                        <p className="font-manrope text-[13px] font-semibold text-gray-900">
                          {ownerLabel(p)}
                        </p>
                        <p className="font-manrope text-[11px] text-gray-400">
                          {p.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>
      ) : (
        <div className="flex flex-col gap-y-5">
          <div className="flex flex-col gap-y-5 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <Field label="Nombre">
                <Input
                  placeholder="Ej: Juan"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Apellido (opcional)">
                <Input
                  placeholder="Ej: Pérez"
                  value={lastName}
                  onChange={(e) => onLastNameChange(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-y-5 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <Field label="Email" error={errors.owner_email}>
                <Input
                  placeholder="dueno@energym.com"
                  icon={<Mail size={15} className="text-gray-400" />}
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  inputMode="email"
                  autoCapitalize="none"
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Teléfono (opcional)">
                <Input
                  placeholder="123456789"
                  icon={<Phone size={15} className="text-gray-400" />}
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  inputMode="numeric"
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-brandPrimary-200 bg-brandPrimary-50 px-3.5 py-2.5">
            <ShieldHalf size={14} className="text-brandPrimary-700" />
            <span className="flex-1 font-manrope text-[11px] text-gray-400">
              Se crea su cuenta con rol Dueño y contraseña temporal{" "}
              <span className="font-bold text-gray-900">tugimnasio123</span>. El
              email queda confirmado automáticamente. Si ese email ya tiene
              cuenta, se reutiliza en vez de crear una nueva.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
