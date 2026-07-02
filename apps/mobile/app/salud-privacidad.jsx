import { ScrollView, View, Text } from "react-native";
import { Stack } from "expo-router";

// Pantalla de rationale exigida por Health Connect (Android 14+): se abre desde
// el diálogo de permisos del sistema vía ACTION_SHOW_PERMISSIONS_RATIONALE.
// Debe explicar qué datos de salud usa la app, para qué y dónde terminan.
// Es pública a propósito: el sistema puede abrirla sin sesión iniciada.

const SECTIONS = [
  {
    title: "Qué datos leemos",
    body: "Pasos, distancia, calorías activas, frecuencia cardíaca y peso corporal, desde Apple Salud o Health Connect según tu dispositivo.",
  },
  {
    title: "Para qué los usamos",
    body: "Solo para mostrarte tu actividad y tu progreso dentro de GymTrack, junto a tus entrenamientos registrados.",
  },
  {
    title: "Qué escribimos",
    body: "Cuando completás una sesión en GymTrack, la registramos como entrenamiento en tu app de salud para que tu historial quede completo.",
  },
  {
    title: "Compartir con tu gimnasio",
    body: 'Tus métricas quedan en tu dispositivo salvo que actives "Compartir con mi gimnasio". Solo en ese caso subimos resúmenes diarios (no muestras crudas) a nuestros servidores para que tu entrenador pueda verlos. Esta opción viene desactivada.',
  },
  {
    title: "Control y eliminación",
    body: "Podés revocar los permisos desde Ajustes de tu teléfono cuando quieras. Si desactivás el compartir con tu gimnasio, borramos de nuestros servidores todas las métricas de salud que hayas subido.",
  },
];

export default function SaludPrivacidad() {
  return (
    <>
      <Stack.Screen options={{ title: "Datos de salud" }} />
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 py-8 gap-6"
      >
        <Text className="font-jakarta-ebold text-2xl tracking-editorial text-slate-900">
          Cómo usa GymTrack tus datos de salud
        </Text>
        {SECTIONS.map((section) => (
          <View key={section.title} className="gap-1.5">
            <Text className="font-jakarta-semi text-base text-slate-900">
              {section.title}
            </Text>
            <Text className="font-manrope text-sm leading-5 text-slate-600">
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}
