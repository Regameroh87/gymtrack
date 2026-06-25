// Sesión activa (web): la sesión de entrenamiento en vivo vive en la app móvil
// (depende de la base local). En web redirige al home, igual que sesion-active/index.web.jsx.

import { redirect } from "next/navigation";

export default function SesionActivePage() {
  redirect("/home");
}
