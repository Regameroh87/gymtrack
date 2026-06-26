import { type ReactNode } from "react";

interface PageHeaderProps {
  section?: string;
  title: string;
  description?: string;
  cta?: ReactNode;
}

export function PageHeader({ section, title, description, cta }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-end md:gap-0">
      <div>
        {section && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
              Gestión
            </span>
            <span className="text-[11px] text-ui-text-muted">·</span>
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandPrimary-600">
              {section}
            </span>
          </div>
        )}
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
          {title}
        </h1>
        {description && (
          <p className="mt-1 font-manrope text-xs text-ui-text-muted">{description}</p>
        )}
      </div>
      {cta && <div className="self-start md:self-auto">{cta}</div>}
    </div>
  );
}
