import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import Button from '../components/Button';
import { getWorkouts } from '../utils/storage';

export default function HomeScreen({ navigation }) {
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = async () => {
    const workouts = await getWorkouts();
    setRecentWorkouts(workouts.slice(0, 5));
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>GymTrack 💪</Text>
          <Text style={styles.subtitle}>Registra tu progreso</Text>
        </View>

        {/* Quick Action */}
        <Button
          title="Nuevo Entrenamiento"
          icon="➕"
          onPress={() => navigation.navigate('NewWorkout')}
          style={styles.newWorkoutButton}
          size="large"
        />

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{recentWorkouts.length}</Text>
            <Text style={styles.statLabel}>Entrenamientos</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>
              {recentWorkouts.reduce((acc, w) => acc + (w.exercises?.length || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Ejercicios</Text>
          </Card>
        </View>

        {/* Recent Workouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrenamientos Recientes</Text>
          
          {recentWorkouts.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyText}>No hay entrenamientos registrados</Text>
              <Text style={styles.emptySubtext}>Comienza tu primer entrenamiento ahora</Text>
            </Card>
          ) : (
            recentWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                onPress={() => navigation.navigate('WorkoutDetail', { workout })}
              >
                <Card style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <Text style={styles.workoutDate}>{formatDate(workout.date)}</Text>
                    <Text style={styles.workoutBadge}>
                      {workout.exercises?.length || 0} ejercicios
                    </Text>
                  </View>
                  <View style={styles.exercisesList}>
                    {workout.exercises?.slice(0, 3).map((exercise, index) => (
                      <Text key={index} style={styles.exerciseName}>
                        {exercise.icon} {exercise.name}
                      </Text>
                    ))}
                    {workout.exercises?.length > 3 && (
                      <Text style={styles.moreExercises}>
                        +{workout.exercises.length - 3} más
                      </Text>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
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
  newWorkoutButton: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  workoutCard: {
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  workoutBadge: {
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exercisesList: {
    gap: 6,
  },
  exerciseName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  moreExercises: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
