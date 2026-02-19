export const EXERCISE_CATEGORIES = {
  CHEST: 'Pecho',
  BACK: 'Espalda',
  LEGS: 'Piernas',
  SHOULDERS: 'Hombros',
  ARMS: 'Brazos',
  CORE: 'Core',
  CARDIO: 'Cardio',
};

export const DEFAULT_EXERCISES = [
  // Pecho
  { id: 'bench-press', name: 'Press de Banca', category: EXERCISE_CATEGORIES.CHEST, icon: '💪' },
  { id: 'incline-press', name: 'Press Inclinado', category: EXERCISE_CATEGORIES.CHEST, icon: '💪' },
  { id: 'dumbbell-fly', name: 'Aperturas con Mancuernas', category: EXERCISE_CATEGORIES.CHEST, icon: '💪' },
  { id: 'push-ups', name: 'Flexiones', category: EXERCISE_CATEGORIES.CHEST, icon: '💪' },
  
  // Espalda
  { id: 'deadlift', name: 'Peso Muerto', category: EXERCISE_CATEGORIES.BACK, icon: '🏋️' },
  { id: 'pull-ups', name: 'Dominadas', category: EXERCISE_CATEGORIES.BACK, icon: '🏋️' },
  { id: 'barbell-row', name: 'Remo con Barra', category: EXERCISE_CATEGORIES.BACK, icon: '🏋️' },
  { id: 'lat-pulldown', name: 'Jalón al Pecho', category: EXERCISE_CATEGORIES.BACK, icon: '🏋️' },
  
  // Piernas
  { id: 'squat', name: 'Sentadilla', category: EXERCISE_CATEGORIES.LEGS, icon: '🦵' },
  { id: 'leg-press', name: 'Prensa de Piernas', category: EXERCISE_CATEGORIES.LEGS, icon: '🦵' },
  { id: 'lunges', name: 'Zancadas', category: EXERCISE_CATEGORIES.LEGS, icon: '🦵' },
  { id: 'leg-curl', name: 'Curl de Piernas', category: EXERCISE_CATEGORIES.LEGS, icon: '🦵' },
  { id: 'leg-extension', name: 'Extensión de Piernas', category: EXERCISE_CATEGORIES.LEGS, icon: '🦵' },
  
  // Hombros
  { id: 'shoulder-press', name: 'Press Militar', category: EXERCISE_CATEGORIES.SHOULDERS, icon: '💪' },
  { id: 'lateral-raise', name: 'Elevaciones Laterales', category: EXERCISE_CATEGORIES.SHOULDERS, icon: '💪' },
  { id: 'front-raise', name: 'Elevaciones Frontales', category: EXERCISE_CATEGORIES.SHOULDERS, icon: '💪' },
  
  // Brazos
  { id: 'barbell-curl', name: 'Curl con Barra', category: EXERCISE_CATEGORIES.ARMS, icon: '💪' },
  { id: 'tricep-dips', name: 'Fondos de Tríceps', category: EXERCISE_CATEGORIES.ARMS, icon: '💪' },
  { id: 'hammer-curl', name: 'Curl Martillo', category: EXERCISE_CATEGORIES.ARMS, icon: '💪' },
  { id: 'tricep-extension', name: 'Extensión de Tríceps', category: EXERCISE_CATEGORIES.ARMS, icon: '💪' },
  
  // Core
  { id: 'plank', name: 'Plancha', category: EXERCISE_CATEGORIES.CORE, icon: '🔥' },
  { id: 'crunches', name: 'Abdominales', category: EXERCISE_CATEGORIES.CORE, icon: '🔥' },
  { id: 'russian-twist', name: 'Giro Ruso', category: EXERCISE_CATEGORIES.CORE, icon: '🔥' },
  
  // Cardio
  { id: 'running', name: 'Correr', category: EXERCISE_CATEGORIES.CARDIO, icon: '🏃' },
  { id: 'cycling', name: 'Bicicleta', category: EXERCISE_CATEGORIES.CARDIO, icon: '🚴' },
  { id: 'rowing', name: 'Remo', category: EXERCISE_CATEGORIES.CARDIO, icon: '🚣' },
];
