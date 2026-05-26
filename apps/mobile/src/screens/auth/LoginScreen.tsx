import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image, StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Radii, Spacing } from '../../theme';
import { api } from '../../lib/api';
import { showAlert } from '../../lib/alert';
import { useAuthStore } from '../../store/auth.store';
import { LANGUAGE_OPTIONS, type SupportedLanguage } from '@fuel-station/shared';
import i18n from 'i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export function LoginScreen({ navigation }: any) {
  const { t } = useTranslation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    } catch (e: any) {
      showAlert({ title: t('common.error'), message: e.response?.data?.message || t('common.error'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
    <StatusBar backgroundColor={Colors.bgPrimary} barStyle="dark-content" />
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.logoIcon} resizeMode="contain" />
            <Text style={styles.appName}>{t('common.appName')}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.title}>{t('auth.welcome')}</Text>
            <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

            {/* Email */}
            <Text style={styles.label}>{t('auth.email')}</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="email-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="manager@station.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign={i18n.dir() === 'rtl' ? 'right' : 'left'}
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, { marginTop: Spacing.md }]}>{t('auth.password')}</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPass}
                textAlign={i18n.dir() === 'rtl' ? 'right' : 'left'}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{loading ? t('auth.signingIn') : t('auth.signIn')}</Text>
            </TouchableOpacity>

            <View style={styles.divider}><View style={styles.line} /><Text style={styles.orText}>or</Text><View style={styles.line} /></View>

            {/* PIN Login */}
            <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('PinLogin')} activeOpacity={0.85}>
              <Text style={styles.btnOutlineText}># {t('auth.pinLogin')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ alignSelf: 'center', marginTop: Spacing.lg }}>
              <Text style={{ color: Colors.primary, fontSize: 13 }}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Lang selector — pinned to bottom */}
        <View style={styles.langRow}>
          {LANGUAGE_OPTIONS.map((l) => (
            <TouchableOpacity key={l.code} onPress={() => i18n.changeLanguage(l.code)} style={[styles.langBtn, i18n.language === l.code && styles.langBtnActive]}>
              <Text style={[styles.langText, i18n.language === l.code && styles.langTextActive]}>{l.nativeLabel}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.xl },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.full, backgroundColor: Colors.bgCard },
  langBtnActive: { backgroundColor: Colors.primary },
  langText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  langTextActive: { color: Colors.textWhite, fontWeight: '700' },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  logoIcon: { width: 72, height: 72, borderRadius: Radii.lg, marginBottom: 10 },
  appName: { ...Typography.h2, color: Colors.textPrimary },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radii.xl, padding: Spacing.xl },
  title: { ...Typography.h2, marginBottom: 4 },
  subtitle: { ...Typography.small, color: Colors.textSecondary, marginBottom: Spacing.xl },
  label: { ...Typography.smallBold, color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 12, backgroundColor: Colors.bgCardAlt },
  inputIcon: { marginEnd: 8, color: Colors.textMuted },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, color: Colors.textPrimary },
  btnPrimary: { marginTop: Spacing.xl, backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 15, alignItems: 'center' },
  btnPrimaryText: { color: Colors.textWhite, fontWeight: '700', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg, gap: 8 },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { fontSize: 12, color: Colors.textMuted },
  btnOutline: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center' },
  btnOutlineText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
});
