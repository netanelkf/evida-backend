import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) { setError('Name, email and password are required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await register({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined });
    } catch (e: any) {
      const msg = e?.response?.data?.errors?.[0]?.msg || e?.response?.data?.error || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text variant="displaySmall" style={styles.logo}>eVida</Text>
        <Text variant="titleMedium" style={styles.subtitle}>Create your account</Text>

        <TextInput label="Full Name" value={name} onChangeText={setName} style={styles.input} mode="outlined" />
        <TextInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} mode="outlined" />
        <TextInput label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} mode="outlined" />
        <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} mode="outlined" />

        {!!error && <HelperText type="error">{error}</HelperText>}

        <Button mode="contained" onPress={handleRegister} loading={loading} style={styles.btn}>
          Create Account
        </Button>

        <Link href="/(auth)/login" asChild>
          <Button mode="text" style={styles.link}>Already have an account? Log in</Button>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { color: '#ef4444', fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: '#94a3b8', textAlign: 'center', marginBottom: 40 },
  input: { marginBottom: 12, backgroundColor: '#1e293b' },
  btn: { marginTop: 8, paddingVertical: 4 },
  link: { marginTop: 12 },
});
