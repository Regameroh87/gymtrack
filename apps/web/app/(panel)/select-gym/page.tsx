// Selector de gym. El layout del panel ya sembró los providers; acá solo se
// renderiza la lista cliente (chromeless, sin sidebar, porque todavía no hay gym).

import { SelectGymList } from "@/components/auth/select-gym-list";
import { getSelfServiceSignupEnabled } from "@/lib/platform-settings";

export const metadata = {
  title: "Elegí un gimnasio",
  robots: { index: false, follow: false },
};

export default async function SelectGymPage() {
  const signupEnabled = await getSelfServiceSignupEnabled();
  return <SelectGymList signupEnabled={signupEnabled} />;
}
