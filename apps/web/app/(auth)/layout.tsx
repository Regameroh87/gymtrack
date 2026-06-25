// Layout de las pantallas de autenticación (login / verify). Pass-through: el
// layout de pantalla completa lo provee AuthSplit en cada pantalla (clon del
// split de apps/mobile login.web.jsx / verify.web.jsx). Rutas públicas (sin sesión).

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
