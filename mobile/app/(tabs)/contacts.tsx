import { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, View, RefreshControl } from 'react-native';
import { Text, Card, FAB, Portal, Modal, TextInput, Button, IconButton } from 'react-native-paper';
import { getContacts, createContact, deleteContact } from '../../services/api';

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setContacts(await getContacts()); } catch {}
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAdd = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const c = await createContact({ name, email: email || undefined, phone: phone || undefined, relationship: relationship || undefined });
      setContacts((prev) => [...prev, c]);
      setModalVisible(false);
      setName(''); setEmail(''); setPhone(''); setRelationship('');
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={styles.name}>{item.name}</Text>
                {item.relationship && <Text style={styles.sub}>{item.relationship}</Text>}
                {item.phone && <Text style={styles.sub}>📞 {item.phone}</Text>}
                {item.email && <Text style={styles.sub}>✉️ {item.email}</Text>}
              </View>
              <IconButton icon="delete" iconColor="#ef4444" onPress={() => handleDelete(item.id)} />
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No emergency contacts yet</Text>
            <Text style={styles.emptyHint}>Tap + to add someone who should be alerted in emergencies</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>Add Emergency Contact</Text>
          <TextInput label="Name *" value={name} onChangeText={setName} style={styles.input} mode="outlined" />
          <TextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} mode="outlined" />
          <TextInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} mode="outlined" />
          <TextInput label="Relationship (e.g. Mom, Doctor)" value={relationship} onChangeText={setRelationship} style={styles.input} mode="outlined" />
          <Button mode="contained" onPress={handleAdd} loading={saving} style={{ marginTop: 8 }}>Add Contact</Button>
          <Button mode="text" onPress={() => setModalVisible(false)}>Cancel</Button>
        </Modal>
      </Portal>

      <FAB icon="plus" style={styles.fab} onPress={() => setModalVisible(true)} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  card: { backgroundColor: '#1e293b', marginHorizontal: 16, marginVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { color: '#f1f5f9', fontWeight: 'bold' },
  sub: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16, marginBottom: 8 },
  emptyHint: { color: '#475569', textAlign: 'center', fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#ef4444' },
  modal: { backgroundColor: '#1e293b', margin: 20, padding: 20, borderRadius: 12 },
  modalTitle: { color: '#f1f5f9', marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: '#0f172a' },
});
