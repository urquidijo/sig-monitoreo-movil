import { StyleSheet, View } from 'react-native';
import { AppButton, Brand } from '../components/ui';
import { colors, spacing } from '../lib/theme';

type Props = {
  onIniciarSesion: () => void;
  onConfigurarDispositivo: () => void;
};

export default function AuthChoiceScreen({
  onIniciarSesion,
  onConfigurarDispositivo,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.brandWrap}>
        <Brand subtitle="Monitoreo infantil en tiempo real" />
      </View>

      <View style={styles.actions}>
        <AppButton title="Soy tutor · Iniciar sesión" onPress={onIniciarSesion} />
        <AppButton
          title="Configurar celular del niño"
          variant="secondary"
          onPress={onConfigurarDispositivo}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xxl,
    justifyContent: 'center',
    gap: 48,
  },
  brandWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
});
