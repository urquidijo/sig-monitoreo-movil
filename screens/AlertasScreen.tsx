import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../lib/auth';
import { AppButton, AppHeader, Card } from '../components/ui';
import { colors, radius, spacing } from '../lib/theme';

type Alerta = {
  id: number;
  mensaje: string;
  atendida: boolean;
  createdAt: string;
  latitud: number;
  longitud: number;
  nino: { nombre: string } | null;
};

type Props = {
  token: string;
  onVolver: () => void;
};

function haceCuanto(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hace instantes';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export default function AlertasScreen({ token, onVolver }: Props) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    try {
      const data: Alerta[] = await apiFetch('/alertas', token);
      setAlertas(data);
    } catch {
      // se muestra vacío
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const marcarAtendida = async (id: number) => {
    try {
      await apiFetch(`/alertas/${id}/atender`, token, { method: 'PATCH' });
      setAlertas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, atendida: true } : a)),
      );
    } catch {
      // no pasa nada
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Alertas" onBack={onVolver} />

      {cargando ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={alertas}
          keyExtractor={(item) => String(item.id)}
          refreshing={cargando}
          onRefresh={cargar}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay alertas registradas.</Text>
          }
          renderItem={({ item }) => (
            <Card style={[styles.card, !item.atendida && styles.cardNueva]}>
              <View style={styles.top}>
                <Text style={styles.icono}>🚨</Text>
                <View style={styles.info}>
                  <Text style={styles.nombre}>
                    {item.nino?.nombre ?? 'Niño'}
                  </Text>
                  <Text style={styles.mensaje}>{item.mensaje}</Text>
                  <Text style={styles.meta}>
                    {haceCuanto(item.createdAt)} · (
                    {item.latitud.toFixed(4)}, {item.longitud.toFixed(4)})
                  </Text>
                </View>
              </View>

              {item.atendida ? (
                <Text style={styles.atendida}>✓ Atendida</Text>
              ) : (
                <AppButton
                  title="Marcar atendida"
                  variant="secondary"
                  onPress={() => marcarAtendida(item.id)}
                />
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.xl, gap: spacing.md },
  empty: { textAlign: 'center', color: colors.textFaint, marginTop: spacing.xxl },
  card: { gap: spacing.md },
  cardNueva: {
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
  },
  top: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icono: { fontSize: 22 },
  info: { flex: 1, gap: 2 },
  nombre: { color: colors.text, fontSize: 16, fontWeight: '700' },
  mensaje: { color: colors.text, fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12 },
  atendida: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
});
