import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { api } from '../../lib/api';
import { Colors, Typography, Radii, Spacing, Shadows } from '../../theme';
import { useOfflineQueueStore } from '../../store/offline-queue.store';

type FilterKey = 'today' | '7days' | '30days';

const PAYMENT_ICONS: Record<string, string> = { cash: 'cash', card: 'credit-card-outline', credit: 'account-cash-outline' };
const PAYMENT_COLORS: Record<string, string> = { cash: Colors.success, card: Colors.navy, credit: Colors.warning };
const FUEL_SHORT: Record<string, string> = { petrol_91: '91', petrol_95: '95', diesel: 'DSL', premium: 'PRE' };

function getDateRange(filter: FilterKey) {
  const now = new Date();
  if (filter === 'today')  return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  if (filter === '7days')  return { from: subDays(now, 7).toISOString(),  to: now.toISOString() };
  return { from: subDays(now, 30).toISOString(), to: now.toISOString() };
}

export function SalesScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FilterKey>('today');
  const range = getDateRange(filter);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'today',  label: t('common.today') },
    { key: '7days',  label: t('sales.sevenDays') },
    { key: '30days', label: t('sales.thirtyDays') },
  ];

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sales', filter],
    queryFn: () => api.get('/sales', { params: range }).then(r => r.data),
  });

  const { data: tanks = [] } = useQuery({
    queryKey: ['tanks'],
    queryFn: () => api.get('/tanks').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const tankMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    tanks.forEach((t: any) => { m[t.id] = t.fuelType; });
    return m;
  }, [tanks]);

  useFocusEffect(
    useCallback(() => { refetch(); }, [refetch]),
  );

  const total = data?.reduce((s: number, x: any) => s + Number(x.totalAmount), 0) ?? 0;
  const liters = data?.reduce((s: number, x: any) => s + Number(x.liters), 0) ?? 0;
  const pendingCount = useOfflineQueueStore(s => s.pending.length);

  return (
    <SafeAreaView style={s.safe}>
      {pendingCount > 0 && (
        <View style={s.pendingBanner}>
          <MaterialCommunityIcons name="cloud-upload-outline" size={16} color="#fff" />
          <Text style={s.pendingBannerText}>
            {pendingCount} {t('common.pendingSync')}
          </Text>
        </View>
      )}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerLabel}>{t('sales.title').toUpperCase()}</Text>
            <Text style={s.headerTitle}>{t('sales.title')}</Text>
          </View>
        </View>
        <View style={[s.filterRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, filter === f.key && s.chipActive]}>
              <Text style={[s.chipText, filter === f.key && s.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Summary strip */}
      {!isLoading && (
        <View style={[s.summaryRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
          <View style={s.summaryItem}>
            <Text style={s.summaryVal}>{data?.length ?? 0}</Text>
            <Text style={s.summaryLbl}>{t('sales.transactions').toUpperCase()}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryVal}>{liters.toFixed(0)} L</Text>
            <Text style={s.summaryLbl}>{t('shifts.litersSold').toUpperCase()}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryVal, s.summaryValRevenue]}>
              SAR {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={s.summaryLbl}>{t('dashboard.revenue').toUpperCase()}</Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : data?.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="shopping-outline" size={48} color={Colors.textMuted} />
            <Text style={s.emptyText}>{t('sales.noPeriod')}</Text>
          </View>
        ) : (
          data?.map((sale: any) => {
            const pm = sale.paymentMethod as string;
            const pmColor = PAYMENT_COLORS[pm] ?? Colors.primary;
            return (
              <View key={sale.id} style={[s.row, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <View style={[s.pmIcon, { backgroundColor: pmColor + '18' }]}>
                  <MaterialCommunityIcons name={PAYMENT_ICONS[pm] ?? 'cash'} size={20} color={pmColor} />
                </View>
                <View style={s.rowMid}>
                  <Text style={[s.rowTitle, { textAlign: !rtl ? 'right' : 'left' }]}>
                    {FUEL_SHORT[tankMap[sale.tankId] ?? ''] ?? '–'}  ·  {Number(sale.liters).toFixed(1)} L
                  </Text>
                  <Text style={[s.rowSub, { textAlign: !rtl ? 'right' : 'left' }]}>
                    {format(new Date(sale.createdAt), 'hh:mm a')}  ·  SAR {Number(sale.pricePerLiter).toFixed(3)}/L
                  </Text>
                </View>
                <Text style={s.rowAmt}>SAR {Number(sale.totalAmount).toFixed(2)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, rtl ? { end: 24 } : { start: 24 }]}
        onPress={() => navigation.navigate('SaleForm')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.bgPrimary },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 6,
    gap: 6,
  },
  pendingBannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  header:         {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    // backgroundColor: Colors.bgCard,
    // borderBottomWidth: 1,
    // borderBottomColor: Colors.border,
  },
  headerTop:      { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  headerLabel:    { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle:    { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  filterRow:      { flexDirection: 'row', gap: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radii.full, backgroundColor: Colors.bgCardAlt, borderWidth: 1, borderColor: Colors.border },
  chipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:       { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  summaryRow:     { flexDirection: 'row', backgroundColor: Colors.primary, marginHorizontal: Spacing.xl, borderRadius: Radii.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryVal:     { fontSize: 15, fontWeight: '800', color: '#fff' },
  summaryValRevenue: { fontSize: 15, fontWeight: '800', color: '#fff' },
  summaryLbl:     { fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 3, letterSpacing: 0.4 },
  divider:        { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  list:           { paddingHorizontal: Spacing.xl, gap: 10, paddingBottom: 40 },
  row:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg, gap: 12 },
  pmIcon:         { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowMid:         { flex: 1 },
  rowTitle:       { ...Typography.bodyMd },
  rowSub:         { ...Typography.small, marginTop: 2 },
  rowAmt:         { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  empty:          { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:      { ...Typography.body, color: Colors.textMuted },
  fab:            {
    position: 'absolute',
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.strong,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
  },
});
