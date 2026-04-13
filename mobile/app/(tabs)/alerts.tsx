import { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, View, RefreshControl } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { getAlerts, acknowledgeAlert } from '../../services/api';
import AlertItem from '../../components/AlertItem';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState('active');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAlerts(filter === 'all' ? undefined : filter, 50);
      setAlerts(data);
    } catch {}
  }, [filter]);

  useEffect(() => { load(); }, [filter]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAck = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'acknowledged' } : a));
    } catch {}
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filter}
        onValueChange={setFilter}
        buttons={[
          { value: 'active', label: 'Active' },
          { value: 'acknowledged', label: 'Acknowledged' },
          { value: 'all', label: 'All' },
        ]}
        style={styles.filter}
      />
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlertItem alert={item} onAcknowledge={handleAck} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No {filter} alerts</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  filter: { margin: 16 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16 },
});
