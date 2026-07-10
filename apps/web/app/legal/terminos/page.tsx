import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones — GymTrack",
  description: "Condiciones de uso de la plataforma GymTrack.",
};

const UPDATED = "10 de julio de 2026";

export default function TerminosPage() {
  return (
    <>
      <h1>Términos y condiciones</h1>
      <p>Última actualización: {UPDATED}</p>

      <p>
        Estos términos regulan el uso de GymTrack, una plataforma de gestión
        de entrenamiento para gimnasios y entrenadores, disponible como app
        móvil y panel web. Al crear una cuenta o usar el servicio aceptás
        estas condiciones.
      </p>

      <h2>El servicio</h2>
      <p>
        GymTrack permite a los gimnasios administrar ejercicios, sesiones,
        planes de entrenamiento y miembros, y a los miembros seguir sus
        entrenamientos y su progreso. El servicio se contrata por gimnasio; los
        miembros acceden por invitación del gimnasio al que pertenecen.
      </p>

      <h2>Cuentas</h2>
      <ul>
        <li>
          El acceso es personal e intransferible. La autenticación es por
          código enviado a tu email: sos responsable de mantener el acceso a
          esa casilla.
        </li>
        <li>
          Los gimnasios son responsables de la exactitud de los datos de los
          miembros que registran y de contar con su consentimiento para
          hacerlo.
        </li>
      </ul>

      <h2>Contenido</h2>
      <p>
        El contenido que los gimnasios cargan (ejercicios, planes, imágenes,
        videos, logos) es de su responsabilidad. No está permitido subir
        contenido ilegal, ofensivo o que infrinja derechos de terceros.
        Podemos remover contenido que viole estas condiciones.
      </p>

      <h2>Datos de salud</h2>
      <p>
        La integración con Health Connect (Android) y Apple Salud (iOS) es
        opcional y requiere tu permiso explícito en el dispositivo. GymTrack
        no es un dispositivo médico: la información de progreso y las métricas
        de salud son orientativas y no reemplazan asesoramiento médico
        profesional. Consultá a un profesional antes de iniciar un programa de
        entrenamiento.
      </p>

      <h2>Disponibilidad y responsabilidad</h2>
      <ul>
        <li>
          El servicio se presta &ldquo;tal cual&rdquo;. Trabajamos para
          mantenerlo disponible y hacemos copias de seguridad periódicas, pero
          no garantizamos disponibilidad ininterrumpida.
        </li>
        <li>
          La app funciona sin conexión y sincroniza al recuperarla; es
          responsabilidad del usuario sincronizar periódicamente sus
          dispositivos.
        </li>
        <li>
          En la máxima medida permitida por la ley, GymTrack no responde por
          daños indirectos derivados del uso del servicio, incluyendo lesiones
          producto de la ejecución de ejercicios.
        </li>
      </ul>

      <h2>Baja del servicio</h2>
      <p>
        Los miembros pueden solicitar la baja a su gimnasio. Al eliminarse la
        última membresía de una cuenta, la cuenta y sus datos personales se
        eliminan de forma permanente conforme a la{" "}
        <a href="/legal/privacidad">política de privacidad</a>.
      </p>

      <h2>Cambios</h2>
      <p>
        Podemos actualizar estos términos; los cambios sustanciales se
        comunicarán por email o dentro de la app. El uso posterior del
        servicio implica la aceptación de los términos vigentes.
      </p>

      <h2>Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Ante
        cualquier controversia serán competentes los tribunales ordinarios de
        la jurisdicción del prestador.
      </p>
    </>
  );
}
