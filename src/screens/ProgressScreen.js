import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import { getWorkouts } from '../utils/storage';

export default function ProgressScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalExercises: 0,
    totalVolume: 0,
    favoriteExercise: null,
  });

  const loadData = async () => {
    const data = await getWorkouts();
    setWorkouts(data);
    calculateStats(data);
  };

  const calculateStats = (workouts) => {
    let totalExercises = 0;
    let totalVolume = 0;
    const exerciseCount = {};

    workouts.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        totalExercises++;
        
        // Count exercise frequency
        exerciseCount[exercise.name] = (exerciseCount[exercise.name] || 0) + 1;

        // Calculate volume
        exercise.sets?.forEach(set => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseFloat(set.reps) || 0;
          totalVolume += weight * reps;
        });
      });
    });

    // Find favorite exercise
    let favoriteExercise = null;
    let maxCount = 0;
    Object.entries(exerciseCount).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteExercise = name;
      }
    });

    setStats({
      totalWorkouts: workouts.length,
      totalExercises,
      totalVolume: totalVolume.toFixed(0),
      favoriteExercise,
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getRecentActivity = () => {
    const last7Days = workouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return workoutDate >= weekAgo;
    });
    return last7Days.length;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progreso 📈</Text>
        <Text style={styles.subtitle}>Tus estadísticas</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Main Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statIcon}>🏋️</Text>
            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Entrenamientos</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statIcon}>💪</Text>
            <Text style={styles.statValue}>{stats.totalExercises}</Text>
            <Text style={styles.statLabel}>Ejercicios</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statIcon}>⚡</Text>
            <Text style={styles.statValue}>{stats.totalVolume}</Text>
            <Text style={styles.statLabel}>Kg Totales</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>{getRecentActivity()}</Text>
            <Text style={styles.statLabel}>Últimos 7 días</Text>
          </Card>
        </View>

        {/* Favorite Exercise */}
        {stats.favoriteExercise && (
          <Card style={styles.favoriteCard}>
            <Text style={styles.favoriteLabel}>Tu ejercicio favorito</Text>
            <Text style={styles.favoriteExercise}>⭐ {stats.favoriteExercise}</Text>
          </Card>
        )}

        {/* Recent Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actividad Reciente</Text>
          {workouts.slice(0, 10).map((workout, index) => {
            const date = new Date(workout.date);
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
            const dayNumber = date.getDate();
            
            return (
              <View key={workout.id} style={styles.activityRow}>
                <View style={styles.dateCircle}>
                  <Text style={styles.dayName}>{dayName}</Text>
                  <Text style={styles.dayNumber}>{dayNumber}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityExercises}>
                    {workout.exercises?.length || 0} ejercicios
                  </Text>
                  <Text style={styles.activitySets}>
                    {workout.exercises?.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0)} series
                  </Text>
                </View>
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkIcon}>✓</Text>
                </View>
              </View>
            );
          })}
        </View>

        {workouts.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>Comienza a entrenar para ver tu progreso</Text>
          </Card>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 24,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  favoriteCard: {
    marginBottom: 24,
    alignItems: 'center',
    paddingVertical: 24,
  },
  favoriteLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  favoriteExercise: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dayName: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  activityInfo: {
    flex: 1,
  },
  activityExercises: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  activitySets: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkIcon: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
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
});
