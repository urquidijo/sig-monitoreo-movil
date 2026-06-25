import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../lib/config';

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{nombreNino}</Text>

      <View
        style={[
          styles.badge,
          dentroArea === false ? styles.badgeAlerta : styles.badgeNormal,
        ]}
      >
        <Text style={styles.badgeText}>
          {estadoConexion === 'conectando' && 'Conectando...'}
          {estadoConexion === 'error' && `Error: ${mensajeError}`}
          {estadoConexion === 'conectado' &&
            (dentroArea === null
              ? 'Esperando primera posición...'
              : dentroArea
                ? 'Dentro del área segura'
                : 'ALERTA: fuera del área segura')}
        </Text>
      </View>

      {ultimaPosicion && (
        <View style={styles.coords}>
          <Text>Lat: {ultimaPosicion.latitude.toFixed(6)}</Text>
          <Text>Lng: {ultimaPosicion.longitude.toFixed(6)}</Text>
        </View>
      )}

      <View style={{ height: 24 }} />
      <Button title="Desvincular dispositivo" onPress={onDesvincular} color="#dc2626" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  badge: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  badgeNormal: {
    backgroundColor: '#dcfce7',
  },
  badgeAlerta: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  coords: {
    alignItems: 'center',
  },
});
