"use client";

// Hook web para replicar el `width < 768` de useWindowDimensions de las pantallas
// .web.jsx de Expo. Devuelve true en viewports angostos. Arranca en false (SSR) y
// se corrige en el primer effect.

import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}
