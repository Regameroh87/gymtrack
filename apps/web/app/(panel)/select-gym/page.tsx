// Selector de gym. El layout del panel ya sembró los providers; acá solo se
// renderiza la lista cliente (chromeless, sin sidebar, porque todavía no hay gym).

import { SelectGymList } from "@/components/auth/select-gym-list";

export const metadata = {
  title: "Elegí un gimnasio",
  robots: { index: false, follow: false },
};

export default function SelectGymPage() {
  return <SelectGymList />;
}
