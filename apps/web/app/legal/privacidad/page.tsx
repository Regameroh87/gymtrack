import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad — GymTrack",
  description:
    "Qué datos recolecta GymTrack, para qué se usan y cómo ejercer tus derechos.",
};

const UPDATED = "10 de julio de 2026";

export default function PrivacidadPage() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <p>Última actualización: {UPDATED}</p>

      <p>
        GymTrack es una plataforma de gestión de entrenamiento para gimnasios y
        entrenadores. Esta política explica qué datos personales tratamos,
        con qué finalidad, dónde se almacenan y cómo podés ejercer tus
        derechos. Aplica a la app móvil y al panel web (app.gymtrack.ar).
      </p>

      <h2>Qué datos recolectamos</h2>
      <ul>
        <li>
          <strong>Datos de cuenta</strong>: email, nombre y apellido, y
          opcionalmente teléfono, documento, dirección, género y foto de
          perfil. Los carga tu gimnasio al registrarte o vos desde tu perfil.
        </li>
        <li>
          <strong>Datos de entrenamiento</strong>: planes, sesiones,
          ejercicios, registros de entrenamientos realizados (series, cargas,
          repeticiones), asistencia por QR y métricas de progreso.
        </li>
        <li>
          <strong>Datos de salud (opcionales, con tu permiso explícito)</strong>:
          si conectás Health Connect (Android) o Apple Salud (iOS), leemos
          pasos, distancia, calorías activas, frecuencia cardíaca y peso
          corporal para mostrar tu progreso, y registramos tus entrenamientos
          completados. Podés revocar el permiso en cualquier momento desde la
          configuración de salud de tu dispositivo; los datos ya sincronizados
          pueden eliminarse solicitándolo (ver contacto).
        </li>
        <li>
          <strong>Datos técnicos</strong>: reportes de errores y datos de
          rendimiento de la app (a través de Sentry), necesarios para mantener
          el servicio funcionando.
        </li>
      </ul>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Prestar el servicio: tu gimnasio gestiona tu entrenamiento y vos seguís tu progreso.</li>
        <li>Enviarte emails transaccionales (alta de cuenta, códigos de acceso).</li>
        <li>Diagnosticar y corregir errores de la aplicación.</li>
      </ul>
      <p>
        No vendemos tus datos ni los usamos para publicidad. Los datos de
        salud se usan exclusivamente para las funciones de progreso que vos
        activás y nunca se comparten con terceros con fines comerciales.
      </p>

      <h2>Quién ve tus datos</h2>
      <p>
        El personal autorizado de tu gimnasio (dueño, administradores y
        coaches) ve tus datos de cuenta y entrenamiento para poder prestarte
        el servicio. Tus datos están aislados por gimnasio: miembros y staff
        de otros gimnasios de la plataforma no pueden acceder a ellos.
      </p>

      <h2>Dónde se almacenan</h2>
      <ul>
        <li>
          <strong>Supabase</strong> (base de datos, autenticación y archivos),
          en servidores de AWS en Estados Unidos (región us-east-2).
        </li>
        <li><strong>Vercel</strong> aloja el panel web.</li>
        <li><strong>Resend</strong> procesa los emails transaccionales.</li>
        <li><strong>Sentry</strong> procesa reportes de errores.</li>
      </ul>
      <p>
        Todos los proveedores aplican cifrado en tránsito y en reposo. La app
        móvil además guarda una copia local de tus datos de entrenamiento en
        tu dispositivo para funcionar sin conexión.
      </p>

      <h2>Cuánto tiempo los conservamos</h2>
      <p>
        Mientras tu cuenta exista. Si tu gimnasio elimina tu membresía y no
        pertenecés a ningún otro gimnasio de la plataforma, tu cuenta y tus
        datos se eliminan de forma permanente, incluyendo tu foto de perfil y
        contenido personalizado.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Conforme a la Ley 25.326 de Protección de Datos Personales
        (Argentina), podés solicitar acceso, rectificación, actualización o
        supresión de tus datos. La Agencia de Acceso a la Información Pública
        (AAIP) es el órgano de control de la ley. Para ejercer tus derechos,
        escribinos y respondemos dentro de los plazos legales.
      </p>

      <h2>Contacto</h2>
      <p>
        Por consultas sobre esta política o sobre tus datos:{" "}
        <a href="mailto:noreply@mail.gymtrack.ar">contacto vía GymTrack</a> o a
        través de tu gimnasio.
      </p>
    </>
  );
}
