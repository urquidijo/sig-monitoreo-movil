import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../lib/config';
import { AppButton, Brand, Card } from '../components/ui';
import { colors, radius, spacing } from '../lib/theme';

type Props = {
  deviceToken: string;
  nombreNino: string;
  onDesvincular: () => void;
};

type EstadoConexion = 'conectando' | 'conectado' | 'error';

export default function TrackingScreen({
  deviceToken,
  nombreNino,
  onDesvincular,
}: Props) {
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>('conectando');
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [ultimaPosicion, setUltimaPosicion] = useState<Location.LocationObjectCoords | null>(null);
  const [dentroArea, setDentroArea] = useState<boolean | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token: deviceToken },
    });
    socketRef.current = socket;

    socket.on('auth:ok', () => setEstadoConexion('conectado'));

    socket.on('auth:error', (data: { mensaje: string }) => {
      setEstadoConexion('error');
      setMensajeError(data.mensaje);
    });

    socket.on('posicion:update', (data: { dentroArea: boolean }) => {
      setDentroArea(data.dentroArea);
    });

    socket.on('connect_error', (err) => {
      setEstadoConexion('error');
      setMensajeError(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [deviceToken]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const iniciarSeguimiento = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setMensajeError('Permiso de ubicación denegado');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (location) => {
          setUltimaPosicion(location.coords);
          socketRef.current?.emit('posicion', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        },
      );
    };

    iniciarSeguimiento();

    return () => {
      subscription?.remove();
    };
  }, []);

  const esAlerta = dentroArea === false;

  const textoEstado =
    estadoConexion === 'conectando'
      ? 'Conectando...'
      : estadoConexion === 'error'
        ? `Error: ${mensajeError}`
        : dentroArea === null
          ? 'Esperando primera ubicación...'
          : dentroArea
            ? 'Dentro del área segura'
            : 'ALERTA: fuera del área segura';

  return (
    <View style={styles.container}>
      <View style={styles.brandWrap}>
        <Brand subtitle="Dispositivo del niño" />
      </View>

      <Text style={styles.nombre}>{nombreNino}</Text>

      <View
        style={[
          styles.badge,
          esAlerta || estadoConexion === 'error'
            ? styles.badgeDanger
            : styles.badgeNormal,
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            esAlerta || estadoConexion === 'error'
              ? styles.badgeTextDanger
              : styles.badgeTextOk,
          ]}
        >
          {textoEstado}
        </Text>
      </View>

      {ultimaPosicion && (
        <Card style={styles.coordsCard}>
          <Text style={styles.coordsLabel}>Ubicación actual</Text>
          <Text style={styles.coordsValue}>
            {ultimaPosicion.latitude.toFixed(6)},{' '}
            {ultimaPosicion.longitude.toFixed(6)}
          </Text>
        </Card>
      )}

      <View style={styles.acciones}>
        <AppButton
          title="Desvincular dispositivo"
          variant="danger"
          onPress={onDesvincular}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  brandWrap: { alignItems: 'center' },
  nombre: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  badge: {
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
  },
  badgeNormal: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.4)',
  },
  badgeDanger: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  badgeText: { fontWeight: '700', textAlign: 'center', fontSize: 16 },
  badgeTextOk: { color: colors.accent },
  badgeTextDanger: { color: colors.dangerText },

  coordsCard: { alignItems: 'center', gap: 4 },
  coordsLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coordsValue: { color: colors.text, fontSize: 15, fontWeight: '600' },

  acciones: { marginTop: spacing.md },
});
