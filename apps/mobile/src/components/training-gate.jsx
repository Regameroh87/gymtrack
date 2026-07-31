// Gate del módulo de entrenamiento (planes, registros, progreso).
//
// Envuelve el contenido de una pantalla: si el socio tiene acceso la deja pasar
// tal cual, y si no la reemplaza por el cartel de bloqueo. El veredicto lo da el
// RPC member_training_access (única fuente de la política, ver useTrainingAccess).
//
// ── Por qué bloquea en vez de esconder la tab ───────────────────────────────
// La tab sigue en la barra. Esconderla con href:null remonta el navigator cuando
// resuelve la query (salto visible al arrancar), y sobre todo: una tab que
// desaparece no explica nada. El cartel es el lugar donde el socio se entera de
// que le falta la inscripción y adónde ir a resolverlo.

// React Native
import { Pressable, Text, View } from "react-native";

// Librerías
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

// Hooks / contextos
import { useTrainingAccess } from "@gymtrack/core/hooks/activities/use-training-access";
import { useActiveGym } from "../contexts/active-gym-context";
import { useGymTheme } from "../contexts/gym-theme-context";
import { useGymOnlinePayments } from "../hooks/activities/use-member-payment";

// Assets
import { Clock, Lock } from "../../assets/icons";

// "2026-06-21" → "21/06/2026". Se parte el string en vez de usar new Date(iso):
// eso lo interpreta en UTC y en Argentina devuelve el día anterior.
const formatDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default function TrainingGate({ children }) {
  const { gymId } = useActiveGym();
  const { allowed, reason, activityName, dueDate, isResolving, refetch } =
    useTrainingAccess(gymId);

  // Sin veredicto todavía no se decide nada: se deja pasar. Mostrar el bloqueo
  // en el primer frame le pintaría el cartel a un socio al día en cada arranque.
  if (allowed || isResolving) return children;

  return (
    <TrainingLocked
      reason={reason}
      activityName={activityName}
      dueDate={dueDate}
      onRetry={refetch}
    />
  );
}

function TrainingLocked({ reason, activityName, dueDate, onRetry }) {
  const router = useRouter();
  const { gymId } = useActiveGym();
  const { brandPrimary } = useGymTheme();
  const { data: onlinePaymentsEnabled } = useGymOnlinePayments(gymId);

  const activity = activityName || "la actividad de entrenamiento";
  const isOverdue = reason === "overdue";

  const copy = isOverdue
    ? {
        Icon: Clock,
        tone: "#d97706",
        bubble: "bg-amber-500/10",
        kicker: "Cuota vencida",
        title: "Regularizá tu cuota",
        // El vencimiento puede venir nulo (suscripción sin fecha cargada).
        body: dueDate
          ? `Tu inscripción a ${activity} venció el ${formatDate(dueDate)}. Ponete al día para volver a entrenar.`
          : `Tu inscripción a ${activity} está vencida. Ponete al día para volver a entrenar.`,
      }
    : reason === "not_subscribed"
      ? {
          Icon: Lock,
          tone: brandPrimary[600],
          bubble: "bg-brandPrimary-600/10",
          kicker: "Entrenamiento",
          title: "Todavía no estás inscripto",
          body: `Para ver rutinas, registrar tus entrenamientos y seguir tu progreso necesitás la inscripción a ${activity}. Consultá en tu gimnasio para sumarte.`,
        }
      : {
          Icon: Lock,
          tone: brandPrimary[600],
          bubble: "bg-brandPrimary-600/10",
          kicker: "Entrenamiento",
          title: "No pudimos verificar tu acceso",
          body: "Probá de nuevo en un momento. Si sigue igual, consultá en tu gimnasio.",
        };

  const { Icon } = copy;
  // El botón de pago solo si el gym cobra online; si no, mandarlo a una pantalla
  // que no puede cobrarle es peor que no ofrecer nada.
  const canPay = isOverdue && onlinePaymentsEnabled;

  return (
    <View className="flex-1 items-center justify-center px-8 bg-ui-background-light dark:bg-ui-background-dark">
      <View
        className={`w-16 h-16 rounded-3xl items-center justify-center mb-5 ${copy.bubble}`}
      >
        <Icon size={26} color={copy.tone} />
      </View>

      <Text
        className="font-manrope-bold uppercase mb-2"
        style={{ fontSize: 10, letterSpacing: 2.2, color: copy.tone }}
      >
        {copy.kicker}
      </Text>

      <Text className="font-jakarta-bold text-xl tracking-tight text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
        {copy.title}
      </Text>

      <Text className="font-manrope text-sm leading-5 text-center text-ui-text-muted dark:text-ui-text-mutedDark mb-7">
        {copy.body}
      </Text>

      {canPay ? (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push("/pagar");
          }}
          style={{ backgroundColor: brandPrimary[700] }}
          className="px-7 py-4 rounded-2xl active:opacity-80"
        >
          <Text className="font-manrope-bold text-sm text-white">
            Pagar mi cuota
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => onRetry?.()}
          className="px-7 py-4 rounded-2xl border border-ui-input-border dark:border-white/10 active:opacity-70"
        >
          <Text className="font-manrope-bold text-sm text-ui-text-main dark:text-ui-text-mainDark">
            Reintentar
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// Para pantallas que ya resuelven su propio layout y solo necesitan el veredicto
// (ej. esconder los accesos rápidos de entrenamiento en el Home).
export function useTrainingGate() {
  const { gymId } = useActiveGym();
  return useTrainingAccess(gymId);
}
