import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  label: string;
  value: string | number | null;
  unit: string;
  icon: string;
  color: string;
  normal?: string;
}

export default function VitalCard({ label, value, unit, icon, color, normal }: Props) {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <MaterialCommunityIcons name={icon as any} size={28} color={color} />
        <View style={styles.text}>
          <Text variant="labelSmall" style={styles.label}>{label}</Text>
          <Text variant="headlineMedium" style={[styles.value, { color }]}>
            {value ?? '—'}
            <Text variant="bodySmall" style={styles.unit}> {value ? unit : ''}</Text>
          </Text>
          {normal && <Text variant="labelSmall" style={styles.normal}>Normal: {normal}</Text>}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1e293b', margin: 6, flex: 1, minWidth: '44%' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1 },
  label: { color: '#94a3b8', marginBottom: 2 },
  value: { fontWeight: 'bold' },
  unit: { color: '#94a3b8' },
  normal: { color: '#64748b', marginTop: 2 },
});
