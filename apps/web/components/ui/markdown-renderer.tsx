"use client";

// Renderizador de Markdown ligero para instrucciones de ejercicio. Usa
// react-markdown con estilos coherentes con el design system del panel.
// Se usa en el drawer de detalle y en cualquier lugar que muestre instrucciones.

import ReactMarkdown from "react-markdown";

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`markdown-instructions ${className ?? ""}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-2 font-manrope text-[13px] leading-[1.6] text-ui-text-main last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-manrope font-bold text-ui-text-main">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="font-manrope italic text-ui-text-main">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="font-manrope text-[13px] leading-[1.6] text-ui-text-main">
              {children}
            </li>
          ),
          h1: ({ children }) => (
            <p className="mb-2 font-jakarta text-[15px] font-bold text-ui-text-main">
              {children}
            </p>
          ),
          h2: ({ children }) => (
            <p className="mb-2 font-jakarta text-[14px] font-bold text-ui-text-main">
              {children}
            </p>
          ),
          h3: ({ children }) => (
            <p className="mb-1.5 font-jakarta text-[13px] font-bold text-ui-text-main">
              {children}
            </p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
