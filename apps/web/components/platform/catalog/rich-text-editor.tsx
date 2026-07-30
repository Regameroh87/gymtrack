"use client";

// Editor de texto enriquecido ligero basado en Markdown. Usa una toolbar con
// botones que insertan sintaxis MD en la posición del cursor + vista previa
// opcional renderizada con react-markdown. Drop-in replacement del <Textarea>
// para el campo instrucciones.

import { useCallback, useRef, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Eye,
  EyeOff,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

// ── Helpers de inserción ────────────────────────────────────────────────────
type InsertOp =
  | { kind: "wrap"; before: string; after: string }
  | { kind: "prefix"; prefix: string };

function applyInsert(
  textarea: HTMLTextAreaElement,
  op: InsertOp,
  setValue: (v: string) => void
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end);

  let replacement: string;
  let cursorOffset: number;

  if (op.kind === "wrap") {
    if (selected) {
      replacement = `${op.before}${selected}${op.after}`;
      cursorOffset = start + replacement.length;
    } else {
      replacement = `${op.before}${op.after}`;
      cursorOffset = start + op.before.length;
    }
  } else {
    // prefix: aplica a cada línea de la selección (o la línea actual)
    const lines = (selected || "").split("\n");
    if (selected) {
      replacement = lines.map((l) => `${op.prefix}${l}`).join("\n");
      cursorOffset = start + replacement.length;
    } else {
      replacement = op.prefix;
      cursorOffset = start + op.prefix.length;
    }
  }

  const next = value.slice(0, start) + replacement + value.slice(end);
  setValue(next);

  // Restaurar cursor después del re-render
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorOffset, cursorOffset);
  });
}

// ── Botones de la toolbar ───────────────────────────────────────────────────
const TOOLBAR_ACTIONS: {
  icon: typeof Bold;
  label: string;
  op: InsertOp;
}[] = [
  { icon: Bold, label: "Negrita", op: { kind: "wrap", before: "**", after: "**" } },
  { icon: Italic, label: "Cursiva", op: { kind: "wrap", before: "*", after: "*" } },
  { icon: List, label: "Viñetas", op: { kind: "prefix", prefix: "- " } },
  { icon: ListOrdered, label: "Lista numerada", op: { kind: "prefix", prefix: "1. " } },
];

// ── Componente principal ────────────────────────────────────────────────────
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Describí la ejecución...",
  rows = 4,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const handleAction = useCallback(
    (op: InsertOp) => {
      if (!textareaRef.current) return;
      applyInsert(textareaRef.current, op, onChange);
    },
    [onChange]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-ui-input-border bg-[#eae8f4]">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-ui-input-border bg-white/60 px-2 py-1.5">
        {TOOLBAR_ACTIONS.map(({ icon: Icon, label, op }) => (
          <button
            key={label}
            type="button"
            title={label}
            onClick={() => handleAction(op)}
            className="flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-brandPrimary-50 active:scale-95"
          >
            <Icon size={14} className="text-ui-text-main" />
          </button>
        ))}

        {/* Separador */}
        <div className="mx-1 h-4 w-px bg-ui-input-border" />

        {/* Toggle vista previa */}
        <button
          type="button"
          title={preview ? "Editar" : "Vista previa"}
          onClick={() => setPreview((v) => !v)}
          className={`flex h-7 items-center gap-1 rounded-md px-2 transition ${
            preview
              ? "bg-brandPrimary-100 text-brandPrimary-700"
              : "text-ui-text-muted hover:bg-brandPrimary-50"
          }`}
        >
          {preview ? <EyeOff size={13} /> : <Eye size={13} />}
          <span className="font-manrope text-[10px] font-bold">
            {preview ? "Editar" : "Preview"}
          </span>
        </button>
      </div>

      {/* Área de edición / preview */}
      {preview ? (
        <div className="min-h-24 px-3.5 py-3">
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="font-manrope text-[13px] italic text-ui-text-muted">
              Sin contenido para previsualizar
            </p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="min-h-24 w-full resize-y bg-transparent p-3.5 font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
        />
      )}
    </div>
  );
}
