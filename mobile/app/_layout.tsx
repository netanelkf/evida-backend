import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { AuthProvider, useAuth } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { updateMe } from '../services/api';

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#ef4444',
    secondary: '#3b82f6',
    background: '#0f172a',
    surface: '#1e293b',
    onSurface: '#f1f5f9',
  },
};

async function registerPushToken() {
  if (!Device.isDevice) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  try { await updateMe({ expo_push_token: token }); } catch {}
}

function RootGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    if (user && inAuth) { router.replace('/(tabs)/'); registerPushToken(); }
  }, [user, loading]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <RootGuard />
      </PaperProvider>
    </AuthProvider>
  );
}
