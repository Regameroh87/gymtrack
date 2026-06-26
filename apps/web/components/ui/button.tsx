import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "btn-gradient text-white shadow-btn-brand hover:shadow-btn-hover active:scale-[0.97] disabled:opacity-50",
  secondary:
    "bg-white border border-ui-input-border text-ui-text-main hover:bg-brandPrimary-50/50 active:scale-[0.97] disabled:opacity-50",
  danger:
    "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/15 active:scale-[0.97] disabled:opacity-50",
  ghost:
    "bg-transparent text-ui-text-muted hover:bg-brandPrimary-50/50 active:scale-[0.97] disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-[10px] gap-1.5",
  md: "px-4 py-2.5 text-[13px] rounded-xl gap-2",
  lg: "px-5 py-3.5 text-sm rounded-2xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center font-manrope font-bold transition",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {loading ? "Guardando..." : children}
      </button>
    );
  }
);

Button.displayName = "Button";
