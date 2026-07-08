import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { API_URL } from '../lib/config';
import { AppButton, Brand, Card, Input } from '../components/ui';
import { colors, radius, spacing } from '../lib/theme';

type Props = {
  onVinculado: (data: { deviceToken: string; ninoId: number; nombreNino: string }) => void;
};

export default function PairingScreen({ onVinculado }: Props) {
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [escaneado, setEscaneado] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const confirmarCodigo = async (codigoAEnviar: string) => {
    setCargando(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/vinculacion/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigoAEnviar, plataforma: 'expo' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? 'No se pudo vincular el dispositivo');
      }

      onVinculado(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (escaneado) return;

    setEscaneado(true);
    setEscaneando(false);
    setCodigo(data);
    confirmarCodigo(data);
  };

  if (escaneando) {
    if (!permission?.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.label}>
            Se necesita acceso a la cámara para escanear el QR.
          </Text>
          <AppButton title="Permitir cámara" onPress={requestPermission} />
          <AppButton
            title="Cancelar"
            variant="ghost"
            onPress={() => setEscaneando(false)}
          />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <AppButton
          title="Cancelar"
          variant="secondary"
          onPress={() => setEscaneando(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.brandWrap}>
        <Brand />
      </View>

      <Card style={styles.card}>
        <Text style={styles.title}>Vincular dispositivo</Text>
        <Text style={styles.label}>
          Ingresa el código de 6 dígitos que aparece en la web, o escanea el QR.
        </Text>

        <Input
          style={styles.codigoInput}
          value={codigo}
          onChangeText={setCodigo}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        {cargando ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <AppButton
              title="Vincular"
              onPress={() => confirmarCodigo(codigo)}
              disabled={codigo.length !== 6}
            />
            <AppButton
              title="Escanear QR"
              variant="secondary"
              onPress={() => {
                setEscaneado(false);
                setEscaneando(true);
              }}
            />
          </>
        )}
      </Card>
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
  card: { gap: spacing.md },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  label: { color: colors.textMuted, textAlign: 'center', fontSize: 13 },
  codigoInput: {
    letterSpacing: 6,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
  },
  camera: {
    width: '100%',
    height: 340,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  error: { color: colors.dangerText, textAlign: 'center' },
});
