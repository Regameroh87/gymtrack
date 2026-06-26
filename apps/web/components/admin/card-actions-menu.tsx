"use client";

// Menú "⋯" de acciones por tarjeta para los listados del catálogo del gym
// (ejercicios, sesiones, planes). Vive encima del Link estirado de la card, por
// eso frena la propagación para no disparar la navegación al abrir el menú.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

export function CardActionsMenu({
  editHref,
  onDelete,
}: {
  editHref: string;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div ref={ref} className="relative z-10" onClick={stop}>
      <button
        type="button"
        aria-label="Acciones"
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-ui-input-border bg-white/90 backdrop-blur transition hover:bg-ui-background-light"
      >
        <MoreVertical size={15} className="text-ui-text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-40 overflow-hidden rounded-xl border border-ui-input-border bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setOpen(false);
              router.push(editHref);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 font-manrope text-[13px] font-semibold text-ui-text-main transition hover:bg-ui-background-light"
          >
            <Pencil size={13} className="text-ui-text-muted" />
            Editar
          </button>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 font-manrope text-[13px] font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={13} color="#dc2626" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
