import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiFetch, ApiError, Usuario } from '../lib/auth';

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
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo obtener la ubicación',
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hola, {usuario.nombre}</Text>
        <Button title="Cerrar sesión" onPress={onCerrarSesion} color="#dc2626" />
      </View>

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
              <View style={styles.ninoCard}>
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
