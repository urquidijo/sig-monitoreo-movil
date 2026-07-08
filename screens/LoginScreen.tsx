import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError, login, Usuario } from '../lib/auth';
import { AppButton, Brand, Card, Input } from '../components/ui';
import { colors, spacing } from '../lib/theme';

type Props = {
  onLogin: (data: { accessToken: string; usuario: Usuario }) => void;
  onVolver: () => void;
};

export default function LoginScreen({ onLogin, onVolver }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setCargando(true);
    setError(null);

    try {
      const data = await login(email, password);
      onLogin(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo iniciar sesión',
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandWrap}>
        <Brand />
      </View>

      <Card style={styles.card}>
        <Text style={styles.title}>Iniciar sesión</Text>

        <Input
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Input
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <AppButton
          title="Ingresar"
          onPress={handleSubmit}
          loading={cargando}
          disabled={!email || !password}
        />
        <AppButton title="Volver" variant="ghost" onPress={onVolver} />
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
    gap: spacing.xxl,
  },
  brandWrap: { alignItems: 'center' },
  card: { gap: spacing.md },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  error: {
    color: colors.dangerText,
    textAlign: 'center',
  },
});
