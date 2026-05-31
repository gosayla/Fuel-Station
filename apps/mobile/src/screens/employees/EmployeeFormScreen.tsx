import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { showAlert } from '../../lib/alert';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Colors, Typography, Radii, Spacing } from '../../theme';

type Role = 'owner' | 'manager' | 'accountant' | 'employee';
const ROLES: Role[] = ['owner', 'manager', 'accountant', 'employee'];

const ROLE_COLOR: Record<Role, { bg: string; text: string; activeBg: string; activeText: string }> = {
  owner:      { bg: '#FFF3E0', text: '#E65100',        activeBg: '#E65100',        activeText: '#fff' },
  manager:    { bg: Colors.primaryLight, text: Colors.primaryDark, activeBg: Colors.primary, activeText: '#fff' },
  accountant: { bg: '#E3F2FD', text: '#1565C0',        activeBg: '#1565C0',        activeText: '#fff' },
  employee:   { bg: '#F3E5F5', text: '#6A1B9A',        activeBg: '#6A1B9A',        activeText: '#fff' },
};

export function EmployeeFormScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId: string | undefined = route.params?.userId;
  const isEdit = !!userId;
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [populated, setPopulated] = useState(false);

  // Load existing user when editing
  const { data: existing, isLoading: loadingUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get(`/users/${userId}`).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing && !populated) {
      setName(existing.name ?? '');
      setRole(existing.role ?? 'employee');
      setEmail(existing.email ?? '');
      setPopulated(true);
    }
  }, [existing, populated]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, any> = { name: name.trim(), role };
      if (email.trim()) body.email = email.trim();
      if (password) body.password = password;
      if (pin) body.pin = pin;
      if (!isEdit && currentUser?.stationId) body.stationId = currentUser.stationId;
      return isEdit
        ? api.patch(`/users/${userId}`, body)
        : api.post('/users', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      navigation.goBack();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => {
      showAlert({ title: t('common.error'), message: e.response?.data?.message ?? t('common.errorGeneric'), variant: 'error' });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      showAlert({ title: t('common.error'), message: t('users.form.nameRequired'), variant: 'error' });
      return;
    }
    if (pin && pin.length !== 4) {
      showAlert({ title: t('common.error'), message: t('users.form.pinHint'), variant: 'error' });
      return;
    }
    saveMutation.mutate();
  };

  // Loading state while fetching existing user
  if (isEdit && loadingUser && !populated) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}
              size={22}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('users.editUser')}</Text>
          <View style={s.headerBtn} />
        </View>
        <ActivityIndicator style={{ marginTop: 80 }} size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons
            name={rtl ? 'arrow-right' : 'arrow-left'}
            size={22}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isEdit ? t('users.editUser') : t('users.addUser')}
        </Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity card ──────────────────────────────── */}
        <View style={s.card}>
          {/* Full name */}
          <Text style={s.fieldLabel}>{t('users.form.fullName')} *</Text>
          <View style={s.inputWrap}>
            <MaterialCommunityIcons
              name="account-outline"
              size={18}
              color={Colors.textMuted}
              style={s.inputIcon}
            />
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder={t('users.form.namePlaceholder')}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={s.separator} />

          {/* Role selector */}
          <Text style={s.fieldLabel}>{t('users.form.role')}</Text>
          <View style={s.rolesRow}>
            {ROLES.map((r) => {
              const rc = ROLE_COLOR[r];
              const active = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[s.roleChip, { backgroundColor: active ? rc.activeBg : rc.bg }]}
                  onPress={() => setRole(r)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.roleChipText, { color: active ? rc.activeText : rc.text }]}>
                    {t(`profile.roles.${r}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Email / password card ──────────────────────── */}
        <Text style={s.sectionTitle}>{t('auth.signIn')}</Text>
        <View style={s.card}>
          {/* Email */}
          <Text style={s.fieldLabel}>
            {t('common.email')}{' '}
            <Text style={s.optional}>({t('common.optional')})</Text>
          </Text>
          <View style={s.inputWrap}>
            <MaterialCommunityIcons
              name="email-outline"
              size={18}
              color={Colors.textMuted}
              style={s.inputIcon}
            />
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('users.form.emailPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.separator} />

          {/* Password */}
          <Text style={s.fieldLabel}>
            {t('auth.password')}{' '}
            <Text style={s.optional}>
              ({isEdit ? t('users.form.passwordHint') : t('common.optional')})
            </Text>
          </Text>
          <View style={s.inputWrap}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={18}
              color={Colors.textMuted}
              style={s.inputIcon}
            />
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder={t('users.form.passwordPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PIN card ───────────────────────────────────── */}
        <Text style={s.sectionTitle}>
          {t('users.form.pin')}{' '}
          <Text style={s.optional}>({t('common.optional')})</Text>
        </Text>
        <View style={s.card}>
          {/* 4-dot progress indicator */}
          <View style={s.pinDots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  { backgroundColor: i < pin.length ? Colors.primary : Colors.border },
                ]}
              />
            ))}
          </View>

          <View style={s.inputWrap}>
            <MaterialCommunityIcons
              name="numeric"
              size={18}
              color={Colors.textMuted}
              style={s.inputIcon}
            />
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
              placeholder={t('users.form.pinPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry={!showPin}
            />
            <TouchableOpacity onPress={() => setShowPin(!showPin)} style={s.eyeBtn}>
              <MaterialCommunityIcons
                name={showPin ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>
            {isEdit ? t('users.form.pinHintEdit') : t('users.form.pinLoginNote')}
          </Text>
        </View>

        {/* ── Save button ────────────────────────────────── */}
        <TouchableOpacity
          style={[s.saveBtn, saveMutation.isPending && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
          activeOpacity={0.85}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.saveBtnText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: Colors.bgPrimary,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...Typography.h3, fontSize: 17 },

  // Content
  content: { padding: Spacing.xl, paddingBottom: 60 },
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.md },

  // Card
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.xl,
  },

  // Fields
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  optional: { fontWeight: '400' as const, color: Colors.textMuted },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 46,
    marginBottom: Spacing.md,
  },
  inputIcon: { marginEnd: 10 },
  input: { flex: 1, ...Typography.body, color: Colors.textPrimary, padding: 0 },
  eyeBtn: { padding: 4 },
  separator: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.lg },

  // Roles
  rolesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  roleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.full,
  },
  roleChipText: { fontSize: 13, fontWeight: '600' as const },

  // PIN
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: Spacing.lg,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  hint: { ...Typography.small, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.sm },

  // Save
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
});
