"use client";

// Switch on/off del panel. Extraído de admin/activities cuando la configuración de
// cobranza necesitó el mismo control: dos copias del mismo switch se despintan sola
// la primera vez que alguien ajusta una de las dos.
export function Toggle({
  on,
  disabled,
  onClick,
  label,
}: {
  on: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition disabled:opacity-50 ${
        on ? "bg-brandPrimary-600" : "bg-ui-input-border"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
