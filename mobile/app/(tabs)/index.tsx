import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { getLatestVitals, getAlertStats } from '../../services/api';
import VitalCard from '../../components/VitalCard';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [vitals, setVitals] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, s] = await Promise.allSettled([getLatestVitals(), getAlertStats()]);
      if (v.status === 'fulfilled') setVitals(v.value);
      if (s.status === 'fulfilled') setStats(s.value);
    } catch {}
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const recordedAt = vitals?.recorded_at
    ? new Date(vitals.recorded_at).toLocaleString()
    : null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
    >
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.greeting}>
          Hello, {user?.name || user?.email} 👋
        </Text>
        {recordedAt && (
          <Text variant="labelSmall" style={styles.ts}>Last reading: {recordedAt}</Text>
        )}
        {stats && Number(stats.active_count) > 0 && (
          <Chip icon="bell-alert" style={styles.alertChip} textStyle={{ color: '#fff' }}>
            {stats.active_count} active alert{Number(stats.active_count) > 1 ? 's' : ''}
          </Chip>
        )}
      </View>

      {!vitals ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No vitals yet.</Text>
          <Text style={styles.emptyHint}>Connect a wearable via Rook to start seeing data here.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          <VitalCard label="Heart Rate" value={vitals.heart_rate} unit="bpm" icon="heart-pulse" color="#ef4444" normal="40–180" />
          <VitalCard label="SpO₂" value={vitals.spo2} unit="%" icon="water-percent" color="#3b82f6" normal="90–100%" />
          <VitalCard label="Systolic BP" value={vitals.systolic_bp} unit="mmHg" icon="gauge" color="#a855f7" normal="70–180" />
          <VitalCard label="Diastolic BP" value={vitals.diastolic_bp} unit="mmHg" icon="gauge-low" color="#8b5cf6" normal="40–120" />
          <VitalCard label="Temperature" value={vitals.temperature} unit="°C" icon="thermometer" color="#f97316" normal="35–39.5°C" />
          <VitalCard label="Blood Glucose" value={vitals.blood_glucose} unit="mg/dL" icon="diabetes" color="#10b981" normal="54–400" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingBottom: 8 },
  greeting: { color: '#f1f5f9', fontWeight: 'bold' },
  ts: { color: '#64748b', marginTop: 4 },
  alertChip: { backgroundColor: '#ef4444', marginTop: 10, alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 18, marginBottom: 8 },
  emptyHint: { color: '#475569', textAlign: 'center', fontSize: 14 },
});
