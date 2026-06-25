import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { API_URL } from '../lib/config';

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
          <Text style={styles.label}>Se necesita acceso a la cámara para escanear el QR.</Text>
          <Button title="Permitir cámara" onPress={requestPermission} />
          <Button title="Cancelar" onPress={() => setEscaneando(false)} />
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
        <Button title="Cancelar" onPress={() => setEscaneando(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vincular dispositivo</Text>
      <Text style={styles.label}>
        Ingresa el código de 6 dígitos que aparece en la web, o escanea el QR.
      </Text>

      <TextInput
        style={styles.input}
        value={codigo}
        onChangeText={setCodigo}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {cargando ? (
        <ActivityIndicator />
      ) : (
        <>
          <Button
            title="Vincular"
            onPress={() => confirmarCodigo(codigo)}
            disabled={codigo.length !== 6}
          />
          <View style={{ height: 12 }} />
          <Button
            title="Escanear QR"
            onPress={() => {
              setEscaneado(false);
              setEscaneando(true);
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  camera: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    textAlign: 'center',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 4,
    textAlign: 'center',
    width: '100%',
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
  },
});
