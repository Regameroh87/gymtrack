type BadgeColor = "primary" | "violet" | "sky" | "amber" | "rose" | "green" | "red" | "muted";

const colorMap: Record<BadgeColor, { bg: string; dot: string; text: string }> = {
  primary: { bg: "bg-brandPrimary-50", dot: "bg-brandPrimary-600", text: "text-brandPrimary-600" },
  violet: { bg: "bg-violet-50", dot: "bg-violet-600", text: "text-violet-600" },
  sky: { bg: "bg-sky-50", dot: "bg-sky-600", text: "text-sky-600" },
  amber: { bg: "bg-amber-50", dot: "bg-amber-600", text: "text-amber-600" },
  rose: { bg: "bg-rose-50", dot: "bg-rose-500", text: "text-rose-500" },
  green: { bg: "bg-green-50", dot: "bg-green-500", text: "text-green-600" },
  red: { bg: "bg-red-50", dot: "bg-red-500", text: "text-red-500" },
  muted: { bg: "bg-ui-background-light", dot: "bg-ui-text-muted", text: "text-ui-text-muted" },
};

interface BadgeProps {
  color?: BadgeColor;
  label: string;
  className?: string;
}

export function Badge({ color = "primary", label, className = "" }: BadgeProps) {
  const c = colorMap[color];
  return (
    <div className={`flex w-fit items-center gap-1 rounded-md px-2 py-0.5 ${c.bg} ${className}`}>
      <span className={`h-1 w-1 rounded-full ${c.dot}`} />
      <span className={`font-manrope text-[10px] font-bold uppercase tracking-wider ${c.text}`}>
        {label}
      </span>
    </div>
  );
}
