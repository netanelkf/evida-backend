import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text variant="displaySmall" style={styles.logo}>eVida</Text>
        <Text variant="titleMedium" style={styles.subtitle}>Emergency Health Monitor</Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          mode="outlined"
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
        />

        {!!error && <HelperText type="error">{error}</HelperText>}

        <Button mode="contained" onPress={handleLogin} loading={loading} style={styles.btn}>
          Log In
        </Button>

        <Link href="/(auth)/register" asChild>
          <Button mode="text" style={styles.link}>Don't have an account? Register</Button>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { color: '#ef4444', fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: '#94a3b8', textAlign: 'center', marginBottom: 40 },
  input: { marginBottom: 12, backgroundColor: '#1e293b' },
  btn: { marginTop: 8, paddingVertical: 4 },
  link: { marginTop: 12 },
});
