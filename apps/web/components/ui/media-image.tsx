"use client";

// Imagen de media (thumbnails de ejercicios, portadas de planes/sesiones, logos…)
// que muestra un skeleton mientras carga y cae al fallback si la URL falla.
// Se dibuja al 100% del contenedor: usalo dentro del div que ya define el
// aspect-ratio / tamaño del thumbnail.
import { useCallback, useEffect, useState, type ReactNode } from "react";

type Status = "loading" | "loaded" | "error";

export function MediaImage({
  src,
  alt = "",
  fallback = null,
  className = "object-cover",
  wrapperClassName = "h-full w-full",
}: {
  src: string | null | undefined;
  alt?: string;
  fallback?: ReactNode;
  /** Clases de la <img> (object-fit, rounding…). */
  className?: string;
  /** Tamaño/forma del contenedor. Por defecto llena al padre. */
  wrapperClassName?: string;
}) {
  const [status, setStatus] = useState<Status>(src ? "loading" : "error");

  useEffect(() => {
    setStatus(src ? "loading" : "error");
  }, [src]);

  // Si la imagen ya venía cacheada, el onLoad puede dispararse antes de hidratar.
  const handleRef = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setStatus("loaded");
  }, []);

  if (!src || status === "error") {
    return <>{fallback}</>;
  }

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={handleRef}
        src={src}
        alt={alt}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={`h-full w-full ${className} ${
          status === "loaded" ? "opacity-100" : "opacity-0"
        } transition-opacity duration-200`}
      />
      {status === "loading" && <MediaSkeleton />}
    </div>
  );
}

// Bloque de carga: base neutra + barrido suave en el índigo de marca.
export function MediaSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 overflow-hidden bg-ui-background-light ${className}`}
    >
      <div className="h-full w-full animate-pulse bg-brandPrimary-700/[0.07]" />
    </div>
  );
}
