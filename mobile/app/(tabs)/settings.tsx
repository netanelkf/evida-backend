import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, Button, Switch, Divider, List } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { getThresholds, resetThresholds } from '../../services/api';

const METRIC_LABELS: Record<string, string> = {
  heart_rate: 'Heart Rate (bpm)',
  spo2: 'SpO₂ (%)',
  systolic_bp: 'Systolic BP (mmHg)',
  diastolic_bp: 'Diastolic BP (mmHg)',
  blood_glucose: 'Blood Glucose (mg/dL)',
  temperature: 'Temperature (°C)',
};

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [thresholds, setThresholds] = useState<any[]>([]);

  useEffect(() => {
    getThresholds().then(setThresholds).catch(() => {});
  }, []);

  const handleReset = async () => {
    try {
      const reset = await resetThresholds();
      setThresholds(reset);
    } catch {}
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Profile</Text>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name || '—'}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user?.phone || '—'}</Text>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user?.role}</Text>
        </Card.Content>
      </Card>

      {/* Thresholds */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.row}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Alert Thresholds</Text>
            <Button compact mode="text" onPress={handleReset}>Reset</Button>
          </View>
          <Text style={styles.hint}>Alerts fire when a reading falls outside these ranges.</Text>
          {thresholds.map((t) => (
            <View key={t.metric}>
              <Divider style={styles.divider} />
              <View style={styles.thresholdRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metricLabel}>{METRIC_LABELS[t.metric] || t.metric}</Text>
                  <Text style={styles.range}>{t.min_value} – {t.max_value}</Text>
                </View>
                <Switch value={t.enabled} color="#ef4444" disabled />
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Logout */}
      <Button
        mode="outlined"
        onPress={logout}
        style={styles.logoutBtn}
        textColor="#ef4444"
        buttonColor="transparent"
      >
        Log Out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  card: { backgroundColor: '#1e293b', marginBottom: 16 },
  sectionTitle: { color: '#f1f5f9', fontWeight: 'bold', marginBottom: 12 },
  label: { color: '#64748b', fontSize: 12, marginTop: 8 },
  value: { color: '#f1f5f9', fontSize: 15 },
  hint: { color: '#64748b', fontSize: 13, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { backgroundColor: '#334155', marginVertical: 6 },
  thresholdRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  metricLabel: { color: '#cbd5e1', fontSize: 14 },
  range: { color: '#94a3b8', fontSize: 13 },
  logoutBtn: { marginBottom: 40, borderColor: '#ef4444' },
});
