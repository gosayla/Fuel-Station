import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  I18nManager,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../../lib/alert';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Colors, Typography, Radii, Spacing } from '../../theme';

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

type Employee = {
  id: string;
  name: string;
  email?: string;
  role: string;
  pinLocked: boolean;
  isActive: boolean;
};

export function EmployeesScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'owner';
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/reset-pin`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: any) =>
      showAlert({ title: t('common.error'), message: e.response?.data?.message ?? t('common.errorGeneric'), variant: 'error' }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: any) =>
      showAlert({ title: t('common.error'), message: e.response?.data?.message ?? t('common.errorGeneric'), variant: 'error' }),
  });

  const handleUnlock = (user: Employee) => {
    showAlert({
      title: t('users.unlockPin'),
      message: t('users.confirmUnlock', { name: user.name }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('users.unlockPin'), onPress: () => unlockMutation.mutate(user.id) },
      ],
    });
  };

  const handleDeactivate = (user: Employee) => {
    showAlert({
      title: t('users.deactivate'),
      message: t('users.confirmDeactivateMessage', { name: user.name }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('users.deactivate'),
          style: 'destructive',
          onPress: () => deactivateMutation.mutate(user.id),
        },
      ],
    });
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const renderItem = ({ item: user }: { item: Employee }) => {
    const roleStyle = ROLE_COLOR[user.role] ?? ROLE_COLOR.employee;
    const initials = getInitials(user.name);
    const isMe = user.id === currentUser?.id;

    return (
      <View style={[s.card, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={[s.avatarCol, { backgroundColor: roleStyle.bg }]}>
          <Text style={[s.avatarText, { color: roleStyle.text }]}>{initials}</Text>
        </View>

        <View style={s.cardInfo}>
          <View style={[s.nameRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <Text style={[s.name, { textAlign: !rtl ? 'right' : 'left' }]} numberOfLines={1}>{user.name}</Text>
            {isMe && (
              <View style={s.youBadge}>
                <Text style={s.youText}>{t('users.you')}</Text>
              </View>
            )}
          </View>
          <Text style={[s.email, { textAlign: !rtl ? 'right' : 'left' }]} numberOfLines={1}>
            {user.email ?? t('profile.pinAccount')}
          </Text>
          <View style={[s.badges, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <View style={[s.roleBadge, { backgroundColor: roleStyle.bg }]}>
              <Text style={[s.roleText, { color: roleStyle.text }]}>
                {t(`profile.roles.${user.role}`)}
              </Text>
            </View>
            {user.pinLocked && (
              <View style={s.lockedBadge}>
                <MaterialCommunityIcons name="lock" size={10} color="#fff" />
                <Text style={s.lockedText}>{t('users.status.pinLocked')}</Text>
              </View>
            )}
          </View>
        </View>

        {!isMe && (
          <View style={s.iconActions}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => navigation.navigate('EmployeeForm', { userId: user.id })}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
            {user.pinLocked && (
              <TouchableOpacity
                style={s.iconBtn}
                onPress={() => handleUnlock(user)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="lock-open-variant-outline" size={18} color={Colors.warning} />
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity
                style={s.iconBtn}
                onPress={() => handleDeactivate(user)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="account-off-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.headerBtn}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={rtl ? 'arrow-right' : 'arrow-left'}
            size={22}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('users.title')}</Text>
        <View style={s.headerBtn}>
          {isOwner && (
            <TouchableOpacity
              onPress={() => navigation.navigate('EmployeeForm', {})}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus" size={26} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Search ─────────────────────────────────────── */}
      <View style={s.searchWrap}>
        <MaterialCommunityIcons
          name="magnify"
          size={18}
          color={Colors.textMuted}
          style={s.searchIcon}
        />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('common.search')}
          placeholderTextColor={Colors.textMuted}
          textAlign={rtl ? 'right' : 'left'}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── List ───────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <Text style={s.empty}>
              {search ? t('common.noResults') : t('users.empty')}
            </Text>
          }
        />
      )}
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

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchIcon: { marginEnd: 8 },
  searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary, padding: 0 },

  // List
  list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs, paddingBottom: 24, gap: Spacing.md },

  // Card
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCol: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontWeight: '700' as const },
  cardInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { ...Typography.bodyMd, fontSize: 15, flexShrink: 1 },
  youBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radii.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  youText: { fontSize: 10, fontWeight: '600' as const, color: Colors.primary },
  email: { ...Typography.small, marginBottom: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.sm },
  roleText: { fontSize: 11, fontWeight: '600' as const },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.danger,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  lockedText: { fontSize: 11, fontWeight: '600' as const, color: '#fff' },

  // Icon action column
  iconActions: { flexDirection: 'column', gap: 6, alignItems: 'center' },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty
  empty: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', marginTop: 60 },
});
