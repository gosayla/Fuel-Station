/**
 * App-wide custom alert that matches the design system.
 * Usage:
 *   showAlert({ title: 'Error', message: 'Something went wrong' });
 *   showAlert({ title: 'Confirm', message: 'Are you sure?', buttons: [
 *     { text: 'Cancel', style: 'cancel' },
 *     { text: 'Delete', style: 'destructive', onPress: () => { ... } },
 *   ]});
 *
 * Mount <AppAlert /> once at the root (inside App.tsx).
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radii, Spacing } from '../theme';

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
};

export type AlertVariant = 'error' | 'warning' | 'success' | 'info';

export type AlertConfig = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  /** When false the backdrop tap does not dismiss. Default: true */
  cancelable?: boolean;
  variant?: AlertVariant;
};

// ── Singleton plumbing ────────────────────────────────────────────────────
type ShowFn = (config: AlertConfig) => void;
let _show: ShowFn | null = null;

export function showAlert(config: AlertConfig) {
  if (_show) {
    _show(config);
  }
}

// ── Variant metadata ──────────────────────────────────────────────────────
const VARIANT_META: Record<AlertVariant, { icon: string; color: string; bg: string }> = {
  error:   { icon: 'alert-circle-outline',   color: Colors.danger,  bg: Colors.dangerLight  },
  warning: { icon: 'alert-outline',           color: Colors.warning, bg: Colors.warningLight },
  success: { icon: 'check-circle-outline',    color: Colors.primary, bg: Colors.primaryLight },
  info:    { icon: 'information-outline',     color: Colors.navy,    bg: Colors.navyLight    },
};

// ── Component ─────────────────────────────────────────────────────────────
export function AppAlert() {
  const [config, setConfig] = useState<AlertConfig | null>(null);

  useEffect(() => {
    _show = (c) => setConfig(c);
    return () => { _show = null; };
  }, []);

  if (!config) return null;

  const cancelable = config.cancelable !== false;
  const buttons: AlertButton[] = config.buttons?.length ? config.buttons : [{ text: 'OK' }];
  const meta = config.variant ? VARIANT_META[config.variant] : null;
  const stackButtons = buttons.length > 2;

  const dismiss = () => {
    if (cancelable) setConfig(null);
  };

  const handleButton = (btn: AlertButton) => {
    setConfig(null);
    btn.onPress?.();
  };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      {/* Backdrop */}
      <Pressable style={s.overlay} onPress={dismiss}>
        {/* Card — inner Pressable stops backdrop dismissal when tapping inside */}
        <Pressable style={s.card} onPress={() => {}}>

          {/* Optional variant icon */}
          {meta && (
            <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
              <MaterialCommunityIcons name={meta.icon} size={28} color={meta.color} />
            </View>
          )}

          {/* Title */}
          <Text style={s.title}>{config.title}</Text>

          {/* Message */}
          {config.message ? (
            <Text style={s.message}>{config.message}</Text>
          ) : null}

          {/* Divider */}
          <View style={s.divider} />

          {/* Buttons */}
          <View style={[s.btns, stackButtons && s.btnsColumn]}>
            {buttons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel      = btn.style === 'cancel';
              return (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    s.btn,
                    stackButtons && s.btnFull,
                    isDestructive && s.btnDestructiveBg,
                    pressed && s.btnPressed,
                  ]}
                  onPress={() => handleButton(btn)}
                >
                  <Text
                    style={[
                      s.btnText,
                      isCancel      && s.btnTextCancel,
                      isDestructive && s.btnTextDestructive,
                      !isCancel && !isDestructive && s.btnTextDefault,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,46,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.xl,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 4,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    alignSelf: 'stretch',
    marginTop: 4,
  },
  btns: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  btnsColumn: {
    flexDirection: 'column',
  },
  btn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
  },
  btnFull: {
    flex: 0,
    marginTop: 2,
    paddingVertical: 14,
  },
  btnDestructiveBg: {
    // no background — text-only destructive style matches iOS conventions
  },
  btnPressed: {
    backgroundColor: Colors.bgCardAlt,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnTextDefault: {
    color: Colors.primary,
  },
  btnTextCancel: {
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  btnTextDestructive: {
    color: Colors.danger,
    fontWeight: '700',
  },
});
