import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Muestra las notificaciones aunque la app esté en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Canal de Android para las alertas (importancia alta = heads-up + sonido).
export async function configurarCanalAlertas() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alertas', {
      name: 'Alertas de zona',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ef4444',
    });
  }
}

/**
 * Pide permisos y obtiene el Expo push token.
 * En Expo Go (Android) no está soportado → devuelve null (sin romper nada).
 */
export async function registrarPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: actual } = await Notifications.getPermissionsAsync();
  let status = actual;

  if (status !== 'granted') {
    const pedido = await Notifications.requestPermissionsAsync();
    status = pedido.status;
  }

  if (status !== 'granted') return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    // Expo Go en Android no soporta push remoto → se usará notificación local
    return null;
  }
}

// Notificación local inmediata (funciona en Expo Go).
export async function mostrarNotificacionLocal(titulo: string, cuerpo: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: cuerpo, sound: 'default' },
    trigger: null,
  });
}
