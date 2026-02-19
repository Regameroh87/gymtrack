import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';

export default function WorkoutDetailScreen({ route }) {
  const { workout } = route.params;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateTotalVolume = () => {
    let total = 0;
    workout.exercises?.forEach(exercise => {
      exercise.sets?.forEach(set => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseFloat(set.reps) || 0;
        total += weight * reps;
      });
    });
    return total.toFixed(0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Detalle del Entrenamiento</Text>
        <Text style={styles.date}>{formatDate(workout.date)}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{workout.exercises?.length || 0}</Text>
              <Text style={styles.summaryLabel}>Ejercicios</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {workout.exercises?.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0)}
              </Text>
              <Text style={styles.summaryLabel}>Series Totales</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{calculateTotalVolume()}</Text>
              <Text style={styles.summaryLabel}>Kg Total</Text>
            </View>
          </View>
        </Card>

        {/* Exercises */}
        {workout.exercises?.map((exercise, index) => (
          <Card key={index} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
            </View>

            <View style={styles.setsTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.setColumn]}>Serie</Text>
                <Text style={[styles.tableHeaderText, styles.valueColumn]}>Reps</Text>
                <Text style={[styles.tableHeaderText, styles.valueColumn]}>Peso (kg)</Text>
              </View>

              {exercise.sets?.map((set, setIndex) => (
                <View key={setIndex} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.setColumn]}>{setIndex + 1}</Text>
                  <Text style={[styles.tableCell, styles.valueColumn]}>{set.reps || '-'}</Text>
                  <Text style={[styles.tableCell, styles.valueColumn]}>{set.weight || '-'}</Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  summaryCard: {
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  exerciseCard: {
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  exerciseIcon: {
    fontSize: 28,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  setsTable: {
    gap: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 16,
    color: colors.text,
  },
  setColumn: {
    flex: 1,
  },
  valueColumn: {
    flex: 2,
    textAlign: 'center',
  },
});
