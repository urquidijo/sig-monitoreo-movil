import { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../lib/theme';

// ---------- Marca / logo ----------
export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={ui.brandRow}>
        <Text style={ui.brandIcon}>📍</Text>
        <Text style={ui.brandText}>SIG Monitoreo</Text>
      </View>
      {subtitle ? <Text style={ui.brandSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ---------- Tarjeta ----------
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[ui.card, style]}>{children}</View>;
}

// ---------- Botón ----------
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'primary'
      ? ui.btnPrimary
      : variant === 'danger'
        ? ui.btnDanger
        : variant === 'secondary'
          ? ui.btnSecondary
          : ui.btnGhost;

  const txt =
    variant === 'primary'
      ? ui.btnPrimaryTxt
      : variant === 'danger'
        ? ui.btnDangerTxt
        : variant === 'secondary'
          ? ui.btnSecondaryTxt
          : ui.btnGhostTxt;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[ui.btnBase, bg, (disabled || loading) && ui.btnDisabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onAccent : colors.text} />
      ) : (
        <Text style={[ui.btnTxtBase, txt]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// ---------- Input ----------
export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      {...props}
      style={[ui.input, props.style]}
    />
  );
}

// ---------- Badge de estado ----------
type BadgeVariant = 'online' | 'offline' | 'idle' | 'danger';

export function Badge({
  label,
  variant,
}: {
  label: string;
  variant: BadgeVariant;
}) {
  const dotColor =
    variant === 'online'
      ? colors.online
      : variant === 'offline'
        ? colors.offline
        : variant === 'danger'
          ? colors.danger
          : colors.idle;

  return (
    <View style={ui.badge}>
      <View style={[ui.badgeDot, { backgroundColor: dotColor }]} />
      <Text style={ui.badgeTxt}>{label}</Text>
    </View>
  );
}

// ---------- Cabecera con volver ----------
export function AppHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={ui.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={ui.backBtn} activeOpacity={0.7}>
          <Text style={ui.backTxt}>‹ Volver</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 72 }} />
      )}
      <Text style={ui.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 72, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

const ui = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { fontSize: 28 },
  brandText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  brandSubtitle: { color: colors.textMuted, fontSize: 13 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },

  btnBase: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnTxtBase: { fontSize: 15, fontWeight: '700' },

  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryTxt: { color: colors.onAccent },

  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryTxt: { color: colors.text },

  btnDanger: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder },
  btnDangerTxt: { color: colors.dangerText },

  btnGhost: { backgroundColor: 'transparent' },
  btnGhostTxt: { color: colors.textMuted },

  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeTxt: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.screenTop,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  backBtn: { width: 72 },
  backTxt: { color: colors.accent, fontSize: 16, fontWeight: '600' },
});
