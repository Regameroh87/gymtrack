import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: string;
  hover?: boolean;
}

export function Card({
  padding = "p-5",
  hover = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "bg-white rounded-card border border-ui-input-border shadow-card-brand",
        hover ? "transition-lift cursor-pointer" : "",
        padding,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
