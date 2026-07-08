import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { apiFetch, ApiError, Usuario } from '../lib/auth';
import { API_URL } from '../lib/config';
import { AppButton, Badge, Card, Input } from '../components/ui';
import { colors, radius, spacing } from '../lib/theme';
import {
  configurarCanalAlertas,
  mostrarNotificacionLocal,
  registrarPushToken,
} from '../lib/notificaciones';

type Nino = {
  id: number;
  nombre: string;
  edad: number | null;
  centroEducativo: { nombre: string } | null;
  vinculado: boolean;
  enLinea: boolean;
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
  alerta?: unknown;
};

type Props = {
  token: string;
  usuario: Usuario;
  onCerrarSesion: () => void;
  onVerMapa: (nino: { id: number; nombre: string }) => void;
  onVerZonas: () => void;
  onVerAlertas: () => void;
};

export default function MisNinosScreen({
  token,
  usuario,
  onCerrarSesion,
  onVerMapa,
  onVerZonas,
  onVerAlertas,
}: Props) {
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [cargando, setCargando] = useState(true);
  const [codigo, setCodigo] = useState('');
  const [afiliando, setAfiliando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posiciones, setPosiciones] = useState<Record<number, Posicion>>({});
  const [presencia, setPresencia] = useState<Record<number, boolean>>({});
  const [socketListo, setSocketListo] = useState(false);
  const [alertasNoLeidas, setAlertasNoLeidas] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  // Último estado dentro/fuera conocido por niño, para detectar la transición
  // y disparar la vibración solo cuando ACABA de salir del área.
  const estadoRef = useRef<Record<number, boolean>>({});
  // Lista de niños actualizada, accesible desde el closure del socket.
  const ninosRef = useRef<Nino[]>([]);
  // Si hay push remoto (dev build), no disparamos notificación local para no
  // duplicar. En Expo Go queda en false → se usa la notificación local.
  const pushRemotoRef = useRef(false);

  const cargarAlertasNoLeidas = async () => {
    try {
      const data = await apiFetch('/alertas?atendida=false', token);
      setAlertasNoLeidas(Array.isArray(data) ? data.length : 0);
    } catch {
      // sin conteo
    }
  };

  // Notificaciones: canal Android + registro del token push del tutor.
  useEffect(() => {
    configurarCanalAlertas();
    registrarPushToken().then((pushToken) => {
      if (pushToken) {
        pushRemotoRef.current = true;
        apiFetch('/auth/push-token', token, {
          method: 'POST',
          body: JSON.stringify({ token: pushToken }),
        }).catch(() => {});
      }
    });
    cargarAlertasNoLeidas();
  }, []);

  const cargarNinos = async () => {
    setCargando(true);
    try {
      const data: Nino[] = await apiFetch('/ninos/mios', token);
      setNinos(data);
      setPresencia((prev) => {
        const next = { ...prev };
        for (const n of data) {
          if (next[n.id] === undefined) next[n.id] = n.enLinea;
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar niños');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarNinos();
  }, []);

  useEffect(() => {
    ninosRef.current = ninos;
  }, [ninos]);

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

    socket.on('presencia:update', (data: { ninoId: number; enLinea: boolean }) => {
      setPresencia((prev) => ({ ...prev, [data.ninoId]: data.enLinea }));
    });

    socket.on('posicion:update', (data: PosicionUpdate) => {
      const estabaDentro = estadoRef.current[data.ninoId];

      // Transición dentro -> fuera: vibra, notifica y suma a la campanita
      if (estabaDentro !== false && data.dentroArea === false) {
        Vibration.vibrate(800);

        const nombre =
          ninosRef.current.find((n) => n.id === data.ninoId)?.nombre ??
          'Tu niño';

        // En Expo Go (sin push remoto) mostramos notificación local.
        if (!pushRemotoRef.current) {
          mostrarNotificacionLocal(
            '🚨 Alerta de zona',
            `${nombre} salió del área segura.`,
          );
        }

        setAlertasNoLeidas((n) => n + 1);
      }
      estadoRef.current[data.ninoId] = data.dentroArea;

      // Una posición recibida implica que el niño está transmitiendo (en línea)
      setPresencia((prev) => ({ ...prev, [data.ninoId]: true }));

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

  const encabezado = (
    <View style={styles.listHeader}>
      <Card style={styles.estadoCard}>
        <View style={styles.estadoRow}>
          <View
            style={[styles.dot, socketListo ? styles.dotOn : styles.dotOff]}
          />
          <Text style={styles.estadoTexto}>
            {socketListo
              ? 'Monitoreo en vivo activo'
              : 'Conectando al monitoreo...'}
          </Text>
        </View>
        <AppButton
          title="🗺  Ver zonas seguras"
          variant="secondary"
          onPress={onVerZonas}
        />
      </Card>

      {ninosFuera.length > 0 && (
        <View style={styles.alertaBanner}>
          <Text style={styles.alertaTexto}>
            🚨 ALERTA: {ninosFuera.map((n) => n.nombre).join(', ')}{' '}
            {ninosFuera.length === 1 ? 'salió' : 'salieron'} del área segura
          </Text>
        </View>
      )}

      <Card style={styles.afiliarBox}>
        <Text style={styles.label}>Afiliarme a un niño</Text>
        <Text style={styles.labelSub}>Ingresa el código que te dio el admin</Text>
        <View style={styles.afiliarRow}>
          <Input
            style={styles.codigoInput}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={codigo}
            onChangeText={setCodigo}
          />
          <AppButton
            title="Afiliar"
            onPress={afiliarse}
            loading={afiliando}
            disabled={codigo.length !== 6}
            style={styles.afiliarBtn}
          />
        </View>
      </Card>

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.seccion}>Mis niños</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.hola}>Hola,</Text>
          <Text style={styles.nombre}>{usuario.nombre}</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={onVerAlertas}
            activeOpacity={0.7}
            style={styles.campana}
          >
            <Text style={styles.campanaIcono}>🔔</Text>
            {alertasNoLeidas > 0 && (
              <View style={styles.campanaBadge}>
                <Text style={styles.campanaBadgeTxt}>
                  {alertasNoLeidas > 9 ? '9+' : alertasNoLeidas}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onCerrarSesion} activeOpacity={0.7}>
            <Text style={styles.salir}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {cargando ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={ninos}
          keyExtractor={(item) => String(item.id)}
          refreshing={cargando}
          onRefresh={cargarNinos}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={encabezado}
          ListEmptyComponent={
            <Text style={styles.empty}>Aún no tienes niños afiliados.</Text>
          }
          renderItem={({ item }) => {
            const posicion = posiciones[item.id];
            const enLinea = presencia[item.id] ?? item.enLinea;

            return (
              <Card
                style={[
                  styles.ninoCard,
                  posicion?.dentroArea === false && styles.ninoCardAlerta,
                ]}
              >
                <View style={styles.ninoTop}>
                  <Text style={styles.ninoNombre}>{item.nombre}</Text>
                  {!item.vinculado ? (
                    <Badge label="Sin celular" variant="idle" />
                  ) : enLinea ? (
                    <Badge label="En línea" variant="online" />
                  ) : (
                    <Badge label="Sin señal" variant="offline" />
                  )}
                </View>

                <Text style={styles.ninoDetalle}>
                  {item.edad ? `${item.edad} años` : ''}
                  {item.centroEducativo
                    ? `${item.edad ? ' · ' : ''}${item.centroEducativo.nombre}`
                    : ''}
                </Text>

                {posicion && (
                  <Text
                    style={[
                      styles.posicion,
                      posicion.dentroArea ? styles.dentro : styles.fuera,
                    ]}
                  >
                    {posicion.dentroArea
                      ? '● Dentro del área segura'
                      : '● Fuera del área segura'}{' '}
                    ({posicion.latitud.toFixed(5)}, {posicion.longitud.toFixed(5)})
                  </Text>
                )}

                <View style={styles.botonesRow}>
                  <AppButton
                    title="Ver ubicación"
                    variant="secondary"
                    onPress={() => verUbicacion(item.id)}
                    style={styles.botonFlex}
                  />
                  <AppButton
                    title="Ver en mapa"
                    onPress={() =>
                      onVerMapa({ id: item.id, nombre: item.nombre })
                    }
                    style={styles.botonFlex}
                  />
                </View>
              </Card>
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
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.screenTop,
    paddingBottom: spacing.md,
  },
  hola: { color: colors.textMuted, fontSize: 14 },
  nombre: { color: colors.text, fontSize: 22, fontWeight: '800' },
  salir: { color: colors.dangerText, fontSize: 14, fontWeight: '600' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  campana: { padding: 4 },
  campanaIcono: { fontSize: 22 },
  campanaBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  campanaBadgeTxt: { color: 'white', fontSize: 11, fontWeight: '800' },

  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  listHeader: { gap: spacing.md },

  estadoCard: { gap: spacing.md },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: colors.online },
  dotOff: { backgroundColor: colors.offline },
  estadoTexto: { color: colors.textMuted, fontSize: 13 },

  alertaBanner: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  alertaTexto: { color: 'white', fontWeight: '800', textAlign: 'center' },

  afiliarBox: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  labelSub: { color: colors.textMuted, fontSize: 12 },
  afiliarRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  codigoInput: { flex: 1, letterSpacing: 4, textAlign: 'center', fontSize: 20 },
  afiliarBtn: { paddingHorizontal: spacing.xl },

  error: { color: colors.dangerText, textAlign: 'center' },

  seccion: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },

  empty: { textAlign: 'center', color: colors.textFaint, marginTop: spacing.xxl },

  ninoCard: { gap: spacing.sm },
  ninoCardAlerta: { borderColor: colors.dangerBorder },
  ninoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ninoNombre: { fontSize: 17, fontWeight: '700', color: colors.text },
  ninoDetalle: { color: colors.textMuted, fontSize: 13 },
  posicion: { fontWeight: '600', fontSize: 13 },
  dentro: { color: colors.online },
  fuera: { color: colors.dangerText },
  botonesRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  botonFlex: { flex: 1 },
});
