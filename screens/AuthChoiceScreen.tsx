import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
      <Text style={styles.title}>SIG Monitoreo</Text>
      <Text style={styles.label}>¿Cómo quieres usar la app?</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={onIniciarSesion}>
        <Text style={styles.primaryButtonText}>Soy tutor, iniciar sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onConfigurarDispositivo}
      >
        <Text style={styles.secondaryButtonText}>
          Configurar celular del niño
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  label: {
    textAlign: 'center',
    color: '#475569',
    marginBottom: 12,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: '#0891b2',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 15,
  },
});
