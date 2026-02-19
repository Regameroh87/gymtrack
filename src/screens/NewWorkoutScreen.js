import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  Alert 
} from 'react-native';
import { colors } from '../theme/colors';
import { DEFAULT_EXERCISES } from '../data/exercises';
import Card from '../components/Card';
import Button from '../components/Button';
import { saveWorkout } from '../utils/storage';

export default function NewWorkoutScreen({ navigation }) {
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  const addExercise = (exercise) => {
    const newExercise = {
      ...exercise,
      sets: [{ reps: '', weight: '' }],
    };
    setSelectedExercises([...selectedExercises, newExercise]);
    setShowExercisePicker(false);
  };

  const removeExercise = (index) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const addSet = (exerciseIndex) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets.push({ reps: '', weight: '' });
    setSelectedExercises(updated);
  };

  const removeSet = (exerciseIndex, setIndex) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex);
    setSelectedExercises(updated);
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setSelectedExercises(updated);
  };

  const handleSave = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Agrega al menos un ejercicio');
      return;
    }

    try {
      await saveWorkout({ exercises: selectedExercises });
      Alert.alert('¡Éxito!', 'Entrenamiento guardado', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el entrenamiento');
    }
  };

  if (showExercisePicker) {
    return (
      <View style={styles.container}>
        <View style={styles.pickerHeader}>
          <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
            <Text style={styles.backButton}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>Seleccionar Ejercicio</Text>
        </View>
        
        <ScrollView style={styles.scrollView}>
          {DEFAULT_EXERCISES.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              onPress={() => addExercise(exercise)}
            >
              <Card style={styles.exerciseOption}>
                <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseOptionName}>{exercise.name}</Text>
                  <Text style={styles.exerciseCategory}>{exercise.category}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nuevo Entrenamiento</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {selectedExercises.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💪</Text>
            <Text style={styles.emptyText}>Agrega ejercicios a tu entrenamiento</Text>
          </Card>
        ) : (
          selectedExercises.map((exercise, exerciseIndex) => (
            <Card key={exerciseIndex} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseTitleRow}>
                  <Text style={styles.exerciseIconLarge}>{exercise.icon}</Text>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                </View>
                <TouchableOpacity onPress={() => removeExercise(exerciseIndex)}>
                  <Text style={styles.removeButton}>🗑️</Text>
                </TouchableOpacity>
              </View>

              {exercise.sets.map((set, setIndex) => (
                <View key={setIndex} style={styles.setRow}>
                  <Text style={styles.setNumber}>Serie {setIndex + 1}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Reps"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={set.reps}
                    onChangeText={(value) => updateSet(exerciseIndex, setIndex, 'reps', value)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Kg"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={set.weight}
                    onChangeText={(value) => updateSet(exerciseIndex, setIndex, 'weight', value)}
                  />
                  {exercise.sets.length > 1 && (
                    <TouchableOpacity onPress={() => removeSet(exerciseIndex, setIndex)}>
                      <Text style={styles.removeSetButton}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity 
                style={styles.addSetButton}
                onPress={() => addSet(exerciseIndex)}
              >
                <Text style={styles.addSetText}>+ Agregar Serie</Text>
              </TouchableOpacity>
            </Card>
          ))
        )}

        <Button
          title="Agregar Ejercicio"
          icon="➕"
          onPress={() => setShowExercisePicker(true)}
          variant="secondary"
          style={styles.addExerciseButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  saveButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 24,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  exerciseCard: {
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseIconLarge: {
    fontSize: 24,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  removeButton: {
    fontSize: 20,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  setNumber: {
    fontSize: 14,
    color: colors.textSecondary,
    width: 60,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeSetButton: {
    fontSize: 18,
    color: colors.error,
    paddingHorizontal: 8,
  },
  addSetButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  addSetText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  addExerciseButton: {
    marginTop: 8,
    marginBottom: 40,
  },
  pickerHeader: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  pickerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
  },
  exerciseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  exerciseIcon: {
    fontSize: 32,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseCategory: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
