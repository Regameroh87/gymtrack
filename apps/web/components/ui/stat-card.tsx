import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor: string;
  bubble: string;
  dot: string;
}

export function StatCard({ icon: Icon, label, value, iconColor, bubble, dot }: StatCardProps) {
  return (
    <div className="flex-1 rounded-card border border-ui-input-border bg-white p-5 shadow-card-brand">
      <div className="mb-3.5 flex items-center justify-between">
        <span className={`flex h-[38px] w-[38px] items-center justify-center rounded-icon ${bubble}`}>
          <Icon size={17} color={iconColor} />
        </span>
        <span className={`h-1.5 w-1.5 rounded-full opacity-40 ${dot}`} />
      </div>
      <p className="font-jakarta text-[30px] font-bold tracking-tight text-ui-text-main">
        {value}
      </p>
      <p className="mt-1 font-manrope text-xs text-ui-text-muted">{label}</p>
      <span className={`mt-4 block h-0.5 w-[35%] rounded-sm opacity-30 ${dot}`} />
    </div>
  );
}
