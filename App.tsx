import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import PairingScreen from './screens/PairingScreen';
import TrackingScreen from './screens/TrackingScreen';

const CLAVE_DEVICE_TOKEN = 'deviceToken';
const CLAVE_NOMBRE_NINO = 'nombreNino';

type Vinculacion = {
  deviceToken: string;
  nombreNino: string;
};

export default function App() {
  const [cargando, setCargando] = useState(true);
  const [vinculacion, setVinculacion] = useState<Vinculacion | null>(null);

  useEffect(() => {
    const cargarVinculacionGuardada = async () => {
      const deviceToken = await SecureStore.getItemAsync(CLAVE_DEVICE_TOKEN);
      const nombreNino = await SecureStore.getItemAsync(CLAVE_NOMBRE_NINO);

      if (deviceToken && nombreNino) {
        setVinculacion({ deviceToken, nombreNino });
      }

      setCargando(false);
    };

    cargarVinculacionGuardada();
  }, []);

  const handleVinculado = async (data: {
    deviceToken: string;
    nombreNino: string;
  }) => {
    await SecureStore.setItemAsync(CLAVE_DEVICE_TOKEN, data.deviceToken);
    await SecureStore.setItemAsync(CLAVE_NOMBRE_NINO, data.nombreNino);
    setVinculacion({ deviceToken: data.deviceToken, nombreNino: data.nombreNino });
  };

  const handleDesvincular = async () => {
    await SecureStore.deleteItemAsync(CLAVE_DEVICE_TOKEN);
    await SecureStore.deleteItemAsync(CLAVE_NOMBRE_NINO);
    setVinculacion(null);
  };

  if (cargando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {vinculacion ? (
        <TrackingScreen
          deviceToken={vinculacion.deviceToken}
          nombreNino={vinculacion.nombreNino}
          onDesvincular={handleDesvincular}
        />
      ) : (
        <PairingScreen onVinculado={handleVinculado} />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
