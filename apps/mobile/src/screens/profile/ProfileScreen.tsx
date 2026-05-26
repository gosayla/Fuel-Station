import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../../lib/alert';
import { useTranslation } from 'react-i18next';
import { MMKV } from 'react-native-mmkv';
import RNRestart from 'react-native-restart';
import { LANGUAGE_OPTIONS, RTL_LANGUAGES, type SupportedLanguage } from '@fuel-station/shared';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api';
import { Colors, Typography, Radii, Spacing } from '../../theme';

const mmkv = new MMKV({ id: 'fuel-station' });
const LANG_KEY = 'fuel_station_lang';

const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  owner:      { bg: '#FFF3E0', text: '#E65100' },
  manager:    { bg: Colors.primaryLight, text: Colors.primaryDark },
  accountant: { bg: '#E3F2FD', text: '#1565C0' },
  employee:   { bg: '#F3E5F5', text: '#6A1B9A' },
};

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  return (
    <View style={[s.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <View style={[s.rowIcon, rtl ? { marginStart: 12 } : { marginEnd: 12 }]}>
        <MaterialCommunityIcons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={[s.rowBody, { alignItems: rtl ? 'flex-start' : 'flex-end' }]}>
        <Text style={[s.rowLabel, { textAlign: 'auto' }]}>{label}</Text>
        <Text style={[s.rowValue, { textAlign: 'auto' }]}>{value}</Text>
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { i18n, t } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const user      = useAuthStore((st) => st.user);
  const clearAuth = useAuthStore((st) => st.clearAuth);

  const role        = user?.role ?? 'employee';
  const roleStyle   = ROLE_COLOR[role] ?? ROLE_COLOR.employee;
  const initials    = getInitials(user?.name ?? '?');
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  function handleLogout() {
    showAlert({
      title: t('profile.logOut'),
      message: t('profile.logOutConfirm'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logOut'),
          style: 'destructive',
          onPress: async () => {
            try { await api.post('/auth/logout'); } catch { /* ignore */ }
            clearAuth();
          },
        },
      ],
    });
  }

  function handleLanguageChange(code: SupportedLanguage) {
    if (code === i18n.language) return;
    const willBeRTL    = RTL_LANGUAGES.includes(code);
    const currentlyRTL = I18nManager.isRTL;
    i18n.changeLanguage(code);
    mmkv.set(LANG_KEY, code);
    if (willBeRTL !== currentlyRTL) {
      I18nManager.forceRTL(willBeRTL);
      showAlert({
        title: t('profile.restartRequired'),
        message: t('profile.restartMessage'),
        cancelable: false,
        buttons: [{ text: t('common.ok'), onPress: () => RNRestart.Restart() }],
      });
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ───────────────────────────────────────── */}
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name={rtl ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerLabel}>{t('nav.profile').toUpperCase()}</Text>
          <Text style={s.headerTitle}>{t('nav.profile')}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero card ──────────────────────────────────── */}
        <View style={s.heroCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.name}>{user?.name ?? '—'}</Text>
          <View style={[s.roleBadge, { backgroundColor: roleStyle.bg }]}>
            <Text style={[s.roleText, { color: roleStyle.text }]}>
              {t(`profile.roles.${role}`)}
            </Text>
          </View>
        </View>

        {/* ── Account details ────────────────────────────── */}
        <Text style={s.sectionTitle}>{t('profile.accountDetails')}</Text>
        <View style={s.card}>
          <InfoRow icon="account-outline"  label={t('users.form.fullName')}  value={user?.name  ?? '—'} />
          <View style={s.divider} />
          <InfoRow icon="email-outline"    label={t('common.email')}          value={user?.email ?? t('profile.pinAccount')} />
          <View style={s.divider} />
          <InfoRow icon="shield-outline"   label={t('common.role')}           value={t(`profile.roles.${role}`)} />
          <View style={s.divider} />
          <InfoRow icon="calendar-outline" label={t('profile.memberSince')}   value={memberSince} />
          <View style={s.divider} />
          <InfoRow
            icon="check-circle-outline"
            label={t('common.status')}
            value={user?.isActive ? t('users.status.active') : t('profile.inactive')}
          />
        </View>

        {/* ── Manage Team (owner / manager only) ─────────── */}
        {(role === 'owner' || role === 'manager') && (
          <>
            <Text style={s.sectionTitle}>{t('users.manageTeam')}</Text>
            <TouchableOpacity
              style={[s.actionCard, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
              onPress={() => navigation.navigate('Employees')}
              activeOpacity={0.8}
            >
              <View style={s.rowIcon}>
                <MaterialCommunityIcons name="account-group-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={[s.rowValue, { flex: 1, ...(!rtl ? { marginEnd: 12 } : { marginStart: 12 }) }]}>{t('nav.users')}</Text>
              <MaterialCommunityIcons
                name={rtl ? 'chevron-left' : 'chevron-right'}
                size={20}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </>
        )}

        {/* ── Language ────────────────────────────────────── */}
        <Text style={s.sectionTitle}>{t('settings.language')}</Text>
        <View style={[s.langGrid, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = i18n.language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[s.langChip, active && s.langChipActive]}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.75}
              >
                <Text style={[s.langChipText, active && s.langChipTextActive]}>
                  {lang.nativeLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Log out ────────────────────────────────────── */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={18} color="#fff" />
          <Text style={s.logoutText}>{t('profile.logOut')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bgPrimary },
  content:      { padding: Spacing.xl, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },

  // Hero
  heroCard: {
    //backgroundColor: Colors.bgCard,
    borderRadius: Radii.xl,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText:   { fontSize: 30, fontWeight: '700', color: '#fff' },
  name:         { ...Typography.h2, marginBottom: 8 },
  roleBadge:    { borderRadius: Radii.full, paddingHorizontal: 14, paddingVertical: 4 },
  roleText:     { fontSize: 13, fontWeight: '600' },

  // Section
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: Spacing.md, marginTop: Spacing.xl },

  // Card rows
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody:      { flex: 1 },
  rowLabel:     { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  rowValue:     { ...Typography.bodyMd },
  divider:      { height: 1, backgroundColor: Colors.border, marginStart: 48 },

  // Language chips
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.xl },
  langChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.full, backgroundColor: Colors.bgCard },
  langChipActive: { backgroundColor: Colors.primary },
  langChipText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  langChipTextActive: { color: '#fff', fontWeight: '700' },

  // Action card (navigate row)
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },

  // Logout
  logoutBtn: {    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.danger,
    borderRadius: Radii.lg,
    paddingVertical: 14,
  },
  logoutText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
