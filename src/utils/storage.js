import AsyncStorage from "@react-native-async-storage/async-storage";

const WORKOUTS_KEY = "@gymtrack_workouts";
const EXERCISES_KEY = "@gymtrack_exercises";

// Workouts Storage
export const saveWorkout = async (workout) => {
  try {
    const workouts = await getWorkouts();
    const newWorkout = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...workout,
    };
    workouts.unshift(newWorkout);
    await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
    return newWorkout;
  } catch (error) {
    console.error("Error saving workout:", error);
    throw error;
  }
};

export const getWorkouts = async () => {
  try {
    const workouts = await AsyncStorage.getItem(WORKOUTS_KEY);
    return workouts ? JSON.parse(workouts) : [];
  } catch (error) {
    console.error("Error getting workouts:", error);
    return [];
  }
};

export const deleteWorkout = async (workoutId) => {
  try {
    const workouts = await getWorkouts();
    const filtered = workouts.filter((w) => w.id !== workoutId);
    await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting workout:", error);
    throw error;
  }
};

// Custom Exercises Storage
export const saveCustomExercise = async (exercise) => {
  try {
    const exercises = await getCustomExercises();
    const newExercise = {
      id: Date.now().toString(),
      ...exercise,
      custom: true,
    };
    exercises.push(newExercise);
    await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises));
    return newExercise;
  } catch (error) {
    console.error("Error saving exercise:", error);
    throw error;
  }
};

export const getCustomExercises = async () => {
  try {
    const exercises = await AsyncStorage.getItem(EXERCISES_KEY);
    return exercises ? JSON.parse(exercises) : [];
  } catch (error) {
    console.error("Error getting exercises:", error);
    return [];
  }
};
