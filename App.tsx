import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import PairingScreen from './screens/PairingScreen';
import TrackingScreen from './screens/TrackingScreen';
import AuthChoiceScreen from './screens/AuthChoiceScreen';
import LoginScreen from './screens/LoginScreen';
import MisNinosScreen from './screens/MisNinosScreen';
import MapaNinoScreen from './screens/MapaNinoScreen';
import ZonasScreen from './screens/ZonasScreen';
import AlertasScreen from './screens/AlertasScreen';
import { apiFetch, Usuario } from './lib/auth';

const CLAVE_DEVICE_TOKEN = 'deviceToken';
const CLAVE_NOMBRE_NINO = 'nombreNino';
const CLAVE_JWT = 'jwt';

type Vinculacion = {
  deviceToken: string;
  nombreNino: string;
};

type Sesion = {
  token: string;
  usuario: Usuario;
};

type Pantalla =
  | 'auth-choice'
  | 'login'
  | 'mis-ninos'
  | 'mapa'
  | 'zonas'
  | 'alertas'
  | 'pairing'
  | 'tracking';

type NinoSeleccionado = { id: number; nombre: string };

export default function App() {
  const [cargando, setCargando] = useState(true);
  const [vinculacion, setVinculacion] = useState<Vinculacion | null>(null);
  const [ninoMapa, setNinoMapa] = useState<NinoSeleccionado | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [pantalla, setPantalla] = useState<Pantalla>('auth-choice');

  useEffect(() => {
    const cargarEstadoGuardado = async () => {
      const deviceToken = await SecureStore.getItemAsync(CLAVE_DEVICE_TOKEN);
      const nombreNino = await SecureStore.getItemAsync(CLAVE_NOMBRE_NINO);
      const jwt = await SecureStore.getItemAsync(CLAVE_JWT);

      if (jwt) {
        try {
          const usuario = await apiFetch('/auth/me', jwt);
          setSesion({ token: jwt, usuario });
          setPantalla('mis-ninos');
        } catch {
          await SecureStore.deleteItemAsync(CLAVE_JWT);
        }
      } else if (deviceToken && nombreNino) {
        setVinculacion({ deviceToken, nombreNino });
        setPantalla('tracking');
      }

      setCargando(false);
    };

    cargarEstadoGuardado();
  }, []);

  const handleVinculado = async (data: {
    deviceToken: string;
    nombreNino: string;
  }) => {
    await SecureStore.setItemAsync(CLAVE_DEVICE_TOKEN, data.deviceToken);
    await SecureStore.setItemAsync(CLAVE_NOMBRE_NINO, data.nombreNino);
    setVinculacion({ deviceToken: data.deviceToken, nombreNino: data.nombreNino });
    setPantalla('tracking');
  };

  const handleDesvincular = async () => {
    await SecureStore.deleteItemAsync(CLAVE_DEVICE_TOKEN);
    await SecureStore.deleteItemAsync(CLAVE_NOMBRE_NINO);
    setVinculacion(null);
    setPantalla('auth-choice');
  };

  const handleLogin = async (data: { accessToken: string; usuario: Usuario }) => {
    await SecureStore.setItemAsync(CLAVE_JWT, data.accessToken);
    setSesion({ token: data.accessToken, usuario: data.usuario });
    setPantalla('mis-ninos');
  };

  const handleCerrarSesion = async () => {
    await SecureStore.deleteItemAsync(CLAVE_JWT);
    setSesion(null);
    setPantalla('auth-choice');
  };

  if (cargando) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color="#22c55e" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {pantalla === 'auth-choice' && (
        <AuthChoiceScreen
          onIniciarSesion={() => setPantalla('login')}
          onConfigurarDispositivo={() => setPantalla('pairing')}
        />
      )}

      {pantalla === 'login' && (
        <LoginScreen
          onLogin={handleLogin}
          onVolver={() => setPantalla('auth-choice')}
        />
      )}

      {pantalla === 'mis-ninos' && sesion && (
        <MisNinosScreen
          token={sesion.token}
          usuario={sesion.usuario}
          onCerrarSesion={handleCerrarSesion}
          onVerMapa={(nino) => {
            setNinoMapa(nino);
            setPantalla('mapa');
          }}
          onVerZonas={() => setPantalla('zonas')}
          onVerAlertas={() => setPantalla('alertas')}
        />
      )}

      {pantalla === 'zonas' && sesion && (
        <ZonasScreen
          token={sesion.token}
          onVolver={() => setPantalla('mis-ninos')}
        />
      )}

      {pantalla === 'alertas' && sesion && (
        <AlertasScreen
          token={sesion.token}
          onVolver={() => setPantalla('mis-ninos')}
        />
      )}

      {pantalla === 'mapa' && sesion && ninoMapa && (
        <MapaNinoScreen
          token={sesion.token}
          ninoId={ninoMapa.id}
          nombreNino={ninoMapa.nombre}
          onVolver={() => setPantalla('mis-ninos')}
        />
      )}

      {pantalla === 'pairing' && (
        <PairingScreen onVinculado={handleVinculado} />
      )}

      {pantalla === 'tracking' && vinculacion && (
        <TrackingScreen
          deviceToken={vinculacion.deviceToken}
          nombreNino={vinculacion.nombreNino}
          onDesvincular={handleDesvincular}
        />
      )}

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
