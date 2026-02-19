import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import { getWorkouts, deleteWorkout } from '../utils/storage';

export default function HistoryScreen({ navigation }) {
  const [workouts, setWorkouts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = async () => {
    const data = await getWorkouts();
    setWorkouts(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  };

  const handleDelete = (workoutId) => {
    Alert.alert(
      'Eliminar Entrenamiento',
      '¿Estás seguro de que quieres eliminar este entrenamiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkout(workoutId);
            loadWorkouts();
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>{workouts.length} entrenamientos</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {workouts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No hay entrenamientos registrados</Text>
          </Card>
        ) : (
          workouts.map((workout) => (
            <TouchableOpacity
              key={workout.id}
              onPress={() => navigation.navigate('WorkoutDetail', { workout })}
              onLongPress={() => handleDelete(workout.id)}
            >
              <Card style={styles.workoutCard}>
                <View style={styles.workoutHeader}>
                  <View>
                    <Text style={styles.workoutDate}>{formatDate(workout.date)}</Text>
                    <Text style={styles.workoutTime}>{formatTime(workout.date)}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{workout.exercises?.length || 0} ejercicios</Text>
                  </View>
                </View>

                <View style={styles.exercisesList}>
                  {workout.exercises?.map((exercise, index) => (
                    <View key={index} style={styles.exerciseRow}>
                      <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.setsCount}>{exercise.sets?.length || 0} series</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
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
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
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
  workoutCard: {
    marginBottom: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  workoutDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  workoutTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  badge: {
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  exercisesList: {
    gap: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseIcon: {
    fontSize: 20,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  setsCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
