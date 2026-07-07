import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { apiFetch, ApiError, Usuario } from '../lib/auth';
import { API_URL } from '../lib/config';

type Nino = {
  id: number;
  nombre: string;
  edad: number | null;
  centroEducativo: { nombre: string } | null;
};

type Posicion = {
  latitud: number;
  longitud: number;
  dentroArea: boolean;
  createdAt: string;
};

type PosicionUpdate = {
  ninoId: number;
  latitud: number;
  longitud: number;
  dentroArea: boolean;
};

type Props = {
  token: string;
  usuario: Usuario;
  onCerrarSesion: () => void;
};

export default function MisNinosScreen({ token, usuario, onCerrarSesion }: Props) {
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [cargando, setCargando] = useState(true);
  const [codigo, setCodigo] = useState('');
  const [afiliando, setAfiliando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posiciones, setPosiciones] = useState<Record<number, Posicion>>({});
  const [socketListo, setSocketListo] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  // Último estado dentro/fuera conocido por niño, para detectar la transición
  // y disparar la vibración solo cuando ACABA de salir del área.
  const estadoRef = useRef<Record<number, boolean>>({});

  const cargarNinos = async () => {
    setCargando(true);
    try {
      const data = await apiFetch('/ninos/mios', token);
      setNinos(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar niños');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarNinos();
  }, []);

  // Conexión en tiempo real: el tutor abre el socket con su JWT y escucha
  // las actualizaciones de posición de sus niños.
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket'],
      auth: { jwt: token },
    });
    socketRef.current = socket;

    socket.on('auth:ok', () => setSocketListo(true));
    socket.on('auth:error', () => setSocketListo(false));

    socket.on('posicion:update', (data: PosicionUpdate) => {
      const estabaDentro = estadoRef.current[data.ninoId];

      // Vibra solo en la transición dentro -> fuera
      if (estabaDentro !== false && data.dentroArea === false) {
        Vibration.vibrate(800);
      }
      estadoRef.current[data.ninoId] = data.dentroArea;

      setPosiciones((prev) => ({
        ...prev,
        [data.ninoId]: {
          latitud: data.latitud,
          longitud: data.longitud,
          dentroArea: data.dentroArea,
          createdAt: new Date().toISOString(),
        },
      }));
    });

    return () => {
      socket.disconnect();
      setSocketListo(false);
    };
  }, [token]);

  // Al estar listo el socket (o al cambiar la lista de niños tras afiliarse),
  // se une a la sala de cada niño para recibir sus posiciones.
  useEffect(() => {
    if (!socketListo) return;
    ninos.forEach((n) =>
      socketRef.current?.emit('join-nino', { ninoId: n.id }),
    );
  }, [socketListo, ninos]);

  const afiliarse = async () => {
    setAfiliando(true);
    setError(null);

    try {
      await apiFetch('/ninos/afiliacion/confirmar', token, {
        method: 'POST',
        body: JSON.stringify({ codigo }),
      });
      setCodigo('');
      cargarNinos();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo afiliar al niño',
      );
    } finally {
      setAfiliando(false);
    }
  };

  const verUbicacion = async (ninoId: number) => {
    try {
      const data = await apiFetch(
        `/monitoreo/nino/${ninoId}/ultima-posicion`,
        token,
      );
      setPosiciones((prev) => ({ ...prev, [ninoId]: data }));
      estadoRef.current[ninoId] = data.dentroArea;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo obtener la ubicación',
      );
    }
  };

  const ninosFuera = ninos.filter(
    (n) => posiciones[n.id]?.dentroArea === false,
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hola, {usuario.nombre}</Text>
        <Button title="Cerrar sesión" onPress={onCerrarSesion} color="#dc2626" />
      </View>

      <View style={styles.estadoRow}>
        <View style={[styles.dot, socketListo ? styles.dotOn : styles.dotOff]} />
        <Text style={styles.estadoTexto}>
          {socketListo
            ? 'Monitoreo en vivo activo'
            : 'Conectando al monitoreo...'}
        </Text>
      </View>

      {ninosFuera.length > 0 && (
        <View style={styles.alertaBanner}>
          <Text style={styles.alertaTexto}>
            🚨 ALERTA: {ninosFuera.map((n) => n.nombre).join(', ')}{' '}
            {ninosFuera.length === 1 ? 'salió' : 'salieron'} del área segura
          </Text>
        </View>
      )}

      <View style={styles.afiliarBox}>
        <Text style={styles.label}>Afiliarme a un niño (código del admin)</Text>
        <View style={styles.afiliarRow}>
          <TextInput
            style={styles.input}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={codigo}
            onChangeText={setCodigo}
          />
          <Button
            title={afiliando ? '...' : 'Afiliar'}
            onPress={afiliarse}
            disabled={afiliando || codigo.length !== 6}
          />
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {cargando ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={ninos}
          keyExtractor={(item) => String(item.id)}
          refreshing={cargando}
          onRefresh={cargarNinos}
          ListEmptyComponent={
            <Text style={styles.empty}>Aún no tienes niños afiliados.</Text>
          }
          renderItem={({ item }) => {
            const posicion = posiciones[item.id];

            return (
              <View
                style={[
                  styles.ninoCard,
                  posicion?.dentroArea === false && styles.ninoCardAlerta,
                ]}
              >
                <Text style={styles.ninoNombre}>{item.nombre}</Text>
                <Text style={styles.ninoDetalle}>
                  {item.edad ? `${item.edad} años` : ''}
                  {item.centroEducativo ? ` · ${item.centroEducativo.nombre}` : ''}
                </Text>

                {posicion && (
                  <Text
                    style={[
                      styles.posicion,
                      posicion.dentroArea ? styles.dentro : styles.fuera,
                    ]}
                  >
                    {posicion.dentroArea
                      ? 'Dentro del área segura'
                      : 'Fuera del área segura'}{' '}
                    ({posicion.latitud.toFixed(5)}, {posicion.longitud.toFixed(5)})
                  </Text>
                )}

                <Button
                  title="Ver ubicación"
                  onPress={() => verUbicacion(item.id)}
                />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  estadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOn: {
    backgroundColor: '#16a34a',
  },
  dotOff: {
    backgroundColor: '#f59e0b',
  },
  estadoTexto: {
    color: '#475569',
    fontSize: 13,
  },
  alertaBanner: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 14,
  },
  alertaTexto: {
    color: 'white',
    fontWeight: '800',
    textAlign: 'center',
  },
  afiliarBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  label: {
    color: '#475569',
    fontSize: 13,
  },
  afiliarRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    letterSpacing: 2,
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 24,
  },
  ninoCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  ninoCardAlerta: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  ninoNombre: {
    fontSize: 17,
    fontWeight: '700',
  },
  ninoDetalle: {
    color: '#64748b',
  },
  posicion: {
    fontWeight: '600',
  },
  dentro: {
    color: '#16a34a',
  },
  fuera: {
    color: '#dc2626',
  },
});
