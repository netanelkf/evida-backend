import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, Chip } from 'react-native-paper';

interface Props {
  alert: any;
  onAcknowledge: (id: string) => void;
}

const METRIC_LABELS: Record<string, string> = {
  heart_rate: 'Heart Rate',
  spo2: 'SpO₂',
  systolic_bp: 'Systolic BP',
  diastolic_bp: 'Diastolic BP',
  blood_glucose: 'Blood Glucose',
  temperature: 'Temperature',
};

const METRIC_UNITS: Record<string, string> = {
  heart_rate: 'bpm', spo2: '%', systolic_bp: 'mmHg',
  diastolic_bp: 'mmHg', blood_glucose: 'mg/dL', temperature: '°C',
};

export default function AlertItem({ alert, onAcknowledge }: Props) {
  const isCritical = alert.severity === 'critical';
  const isActive = alert.status === 'active';

  return (
    <Card style={[styles.card, isCritical && styles.critical]}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleMedium" style={styles.metric}>
            {METRIC_LABELS[alert.metric] || alert.metric}
          </Text>
          <Chip
            style={{ backgroundColor: isCritical ? '#ef4444' : '#f59e0b' }}
            textStyle={{ color: '#fff', fontSize: 11 }}
          >
            {alert.severity.toUpperCase()}
          </Chip>
        </View>

        <Text variant="headlineSmall" style={styles.value}>
          {alert.value} {METRIC_UNITS[alert.metric] || ''}
        </Text>
        <Text variant="bodySmall" style={styles.range}>
          Normal range: {alert.threshold_min} – {alert.threshold_max} {METRIC_UNITS[alert.metric] || ''}
        </Text>
        <Text variant="labelSmall" style={styles.time}>
          {new Date(alert.created_at).toLocaleString()}
        </Text>

        {isActive && (
          <Button
            mode="outlined"
            compact
            onPress={() => onAcknowledge(alert.id)}
            style={styles.ackBtn}
          >
            Acknowledge
          </Button>
        )}
        {!isActive && (
          <Text style={styles.acked}>✓ Acknowledged</Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1e293b', marginHorizontal: 16, marginVertical: 6 },
  critical: { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metric: { color: '#f1f5f9', fontWeight: 'bold' },
  value: { color: '#ef4444', fontWeight: 'bold' },
  range: { color: '#94a3b8', marginTop: 2 },
  time: { color: '#64748b', marginTop: 4 },
  ackBtn: { marginTop: 10, alignSelf: 'flex-start', borderColor: '#64748b' },
  acked: { color: '#10b981', marginTop: 8, fontSize: 13 },
});
