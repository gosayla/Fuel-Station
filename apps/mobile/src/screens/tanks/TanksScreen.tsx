import React, { useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Colors, Typography, Radii, Spacing, Shadows } from '../../theme';

const FUEL_LABELS: Record<string, string> = {
  petrol_91: '91',
  petrol_95: '95',
  diesel: 'Diesel',
  premium: 'Premium',
};

const FUEL_COLORS: Record<string, string> = {
  petrol_91: '#1565C0',
  petrol_95: '#2E7D32',
  diesel:    '#F57F17',
  premium:   '#6A1B9A',
};

function TankCard({ tank, canEdit, onEdit }: { tank: any; canEdit: boolean; onEdit: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const pct = Math.min(100, (Number(tank.currentLevelLiters) / Number(tank.capacityLiters)) * 100);
  const isLow = Number(tank.currentLevelLiters) <= Number(tank.lowLevelThreshold);
  const color = isLow ? Colors.danger : FUEL_COLORS[tank.fuelType] ?? Colors.primary;

  return (
    <View style={s.card}>
      <View style={[s.cardHeader, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={[s.fuelBadge, { backgroundColor: color + '18' }]}>
          <Text style={[s.fuelLabel, { color }]}>{FUEL_LABELS[tank.fuelType] ?? tank.fuelType}</Text>
        </View>
        <Text style={s.tankName}>{tank.name}</Text>
        {isLow && (
          <View style={s.alertBadge}>
            <MaterialCommunityIcons name="alert" size={12} color={Colors.danger} />
            <Text style={s.alertText}>{t('tanks.low')}</Text>
          </View>
        )}
        {canEdit && (
          <TouchableOpacity onPress={() => onEdit(tank.id)} activeOpacity={0.7} style={s.editBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[s.trackBg, { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }]}>
        <View style={[s.trackFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>

      <View style={[s.statsRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={s.stat}>
          <Text style={s.statVal}>{Number(tank.currentLevelLiters).toLocaleString()} L</Text>
          <Text style={s.statLbl}>{t('tanks.current').toUpperCase()}</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statVal, { color }]}>{pct.toFixed(0)}%</Text>
          <Text style={s.statLbl}>{t('tanks.fill').toUpperCase()}</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statVal}>{Number(tank.capacityLiters).toLocaleString()} L</Text>
          <Text style={s.statLbl}>{t('tanks.capacity').toUpperCase()}</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statVal, { color: Colors.textSecondary }]}>
            SAR {Number(tank.currentPrice).toFixed(3)}
          </Text>
          <Text style={s.statLbl}>{t('tanks.priceLabel').toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

export function TanksScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const role = useAuthStore(s => s.user?.role);
  const canManage = role === 'owner' || role === 'manager';
  const [showArchived, setShowArchived] = useState(false);

  const activeQuery = useQuery({
    queryKey: ['tanks'],
    queryFn: () => api.get('/tanks').then(r => r.data),
    refetchInterval: 60_000,
    enabled: !showArchived,
  });

  const archivedQuery = useQuery({
    queryKey: ['tanks-archived'],
    queryFn: () => api.get('/tanks/archived').then(r => r.data),
    enabled: showArchived,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tanks/${id}`, { isActive: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tanks'] });
      qc.invalidateQueries({ queryKey: ['tanks-archived'] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tanks'] });
      qc.invalidateQueries({ queryKey: ['tanks-archived'] });
    },
  });

  const { data, isLoading, refetch, isFetching } = showArchived ? archivedQuery : activeQuery;

  const handleEdit = (tankId: string) => navigation.navigate('TankForm', { tankId });
  const handleAdd  = () => navigation.navigate('TankForm');

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerLabel}>{t('tanks.title').toUpperCase()}</Text>
        <View style={[s.headerRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
          <Text style={s.headerTitle}>{showArchived ? 'Archived Tanks' : t('tanks.title')}</Text>
          <View style={[{ flexDirection: rtl ? 'row' : 'row-reverse' }, { gap: 8 }]}>
            {canManage && (
              <TouchableOpacity
                style={s.deliveriesBtn}
                onPress={() => navigation.navigate('Purchases')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="tanker-truck" size={16} color={Colors.primary} />
                <Text style={s.deliveriesBtnText}>{t('nav.purchases')}</Text>
              </TouchableOpacity>
            )}
            {canManage && (
              <TouchableOpacity
                style={[s.archiveToggle, showArchived && s.archiveToggleActive]}
                onPress={() => setShowArchived(v => !v)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={showArchived ? 'archive' : 'archive-outline'}
                  size={15}
                  color={showArchived ? '#fff' : Colors.textSecondary}
                />
                <Text style={[s.archiveToggleText, showArchived && s.archiveToggleTextActive]}>
                  {showArchived ? 'Active' : 'Archived'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={s.sub}>
          {showArchived
            ? `${data?.length ?? 0} archived`
            : t('tanks.activeCount', { n: data?.length ?? 0 })}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
          ) : data?.length === 0 ? (
            <View style={s.empty}>
              <MaterialCommunityIcons
                name={showArchived ? 'archive-off-outline' : 'gas-station-off'}
                size={48}
                color={Colors.textMuted}
              />
              <Text style={s.emptyText}>
                {showArchived ? 'No archived tanks' : t('tanks.empty')}
              </Text>
            </View>
          ) : showArchived ? (
            data?.map((tank: any) => (
              <ArchivedCard
                key={tank.id}
                tank={tank}
                restoring={restoreMutation.isPending}
                onRestore={() => restoreMutation.mutate(tank.id)}
              />
            ))
          ) : (
            data?.map((tank: any) => (
              <TankCard key={tank.id} tank={tank} canEdit={canManage} onEdit={handleEdit} />
            ))
          )}
        </ScrollView>

        {canManage && !showArchived && (
          <TouchableOpacity style={[s.fab, rtl ? { end: 24 } : { start: 24 }]} onPress={handleAdd} activeOpacity={0.85}>
            <MaterialCommunityIcons name="plus" size={26} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function ArchivedCard({ tank, restoring, onRestore }: { tank: any; restoring: boolean; onRestore: () => void }) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const color = FUEL_COLORS[tank.fuelType] ?? Colors.primary;
  return (
    <View style={[s.card, s.cardArchived]}>
      <View style={[s.cardHeader, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={[s.fuelBadge, { backgroundColor: color + '18' }]}>
          <Text style={[s.fuelLabel, { color }]}>{FUEL_LABELS[tank.fuelType] ?? tank.fuelType}</Text>
        </View>
        <Text style={[s.tankName, { color: Colors.textMuted }]}>{tank.name}</Text>
        <TouchableOpacity
          style={s.restoreBtn}
          onPress={onRestore}
          activeOpacity={0.8}
          disabled={restoring}
        >
          <MaterialCommunityIcons name="restore" size={14} color={Colors.primary} />
          <Text style={s.restoreBtnText}>Restore</Text>
        </TouchableOpacity>
      </View>
      <View style={[s.statsRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={s.stat}>
          <Text style={[s.statVal, { color: Colors.textMuted }]}>{Number(tank.capacityLiters).toLocaleString()} L</Text>
          <Text style={s.statLbl}>CAPACITY</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statVal, { color: Colors.textMuted }]}>SAR {Number(tank.currentPrice).toFixed(3)}</Text>
          <Text style={s.statLbl}>PRICE</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.bgPrimary },
  header:     {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    // backgroundColor: Colors.bgCard,
    // borderBottomWidth: 1,
    // borderBottomColor: Colors.border,
  },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  sub:        { ...Typography.small, marginTop: 4 },
  list:       { padding: Spacing.xl, gap: 14, paddingBottom: 40 },
  card:       { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  tankName:   { ...Typography.bodyMd, flex: 1 },
  fuelBadge:  { borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 3 },
  fuelLabel:  { fontSize: 11, fontWeight: '700' },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.dangerLight, borderRadius: Radii.sm, paddingHorizontal: 6, paddingVertical: 2 },
  alertText:  { fontSize: 10, color: Colors.danger, fontWeight: '700' },
  trackBg:    { height: 8, borderRadius: 4, backgroundColor: Colors.bgCardAlt, marginBottom: 14, overflow: 'hidden' },
  trackFill:  { height: 8, borderRadius: 4 },
  statsRow:   { flexDirection: 'row' },
  stat:       { flex: 1, alignItems: 'center' },
  statVal:    { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  statLbl:    { fontSize: 9, color: Colors.textMuted, marginTop: 2, letterSpacing: 0.4 },
  empty:      { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:  { ...Typography.body, color: Colors.textMuted },
  editBtn:    { padding: 4 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  archiveToggle:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.bgCardAlt, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border },
  archiveToggleActive: { backgroundColor: Colors.textSecondary, borderColor: Colors.textSecondary },
  archiveToggleText:   { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  archiveToggleTextActive: { color: '#fff' },
  deliveriesBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primaryLight, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.primary + '40' },
  deliveriesBtnText:  { fontSize: 12, fontWeight: '700', color: Colors.primary },
  cardArchived: { opacity: 0.75 },
  restoreBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryLight, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 5 },
  restoreBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  fab:        { position: 'absolute', bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.strong, shadowColor: Colors.primary, shadowOpacity: 0.35 },
});
