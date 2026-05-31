import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../lib/api';
import { Colors, Typography, Radii, Spacing, Shadows } from '../../theme';
import { useAuthStore } from '../../store/auth.store';

type PosItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
};

type PosSale = {
  id: string;
  paymentMethod: 'cash' | 'card' | 'credit';
  totalAmount: number;
  totalItems: number;
  createdAt: string;
};

type PosRestock = {
  id: string;
  itemName: string;
  quantity: number;
  totalCost: number;
  purchasedAt: string;
};

const PAYMENT_ICONS: Record<string, string> = {
  cash: 'cash',
  card: 'credit-card-outline',
  credit: 'account-cash-outline',
};

export function PosScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const role = useAuthStore((s) => s.user?.role);
  const isManagerLike = role === 'owner' || role === 'manager' || role === 'accountant';

  const itemsQuery = useQuery({
    queryKey: ['pos-items'],
    queryFn: () => api.get('/pos/items').then((r) => r.data as PosItem[]),
  });

  const salesQuery = useQuery({
    queryKey: ['pos-sales'],
    queryFn: () => api.get('/pos/sales').then((r) => r.data as PosSale[]),
  });

  const restocksQuery = useQuery({
    queryKey: ['pos-restocks'],
    queryFn: () => api.get('/pos/restocks').then((r) => r.data as PosRestock[]),
    enabled: isManagerLike,
  });

  const lowStock = (itemsQuery.data || []).filter((item) => Number(item.quantity) <= 5).length;
  const totalValue = (itemsQuery.data || []).reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0,
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={[s.headerLabel, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.headerLabel')}</Text>
        <Text style={[s.headerTitle, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.headerTitle')}</Text>
      </View>

      <View style={[s.kpiRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={s.kpiCard}>
          <Text style={s.kpiValue}>{itemsQuery.data?.length || 0}</Text>
          <Text style={s.kpiLabel}>{t('pos.items')}</Text>
        </View>
        <View style={s.kpiCard}>
          <Text style={s.kpiValue}>{lowStock}</Text>
          <Text style={s.kpiLabel}>{t('pos.lowStock')}</Text>
        </View>
        <View style={s.kpiCard}>
          <Text style={s.kpiValue}>SAR {totalValue.toFixed(0)}</Text>
          <Text style={s.kpiLabel}>{t('pos.stockValue')}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={itemsQuery.isFetching || salesQuery.isFetching}
            onRefresh={() => {
              itemsQuery.refetch();
              salesQuery.refetch();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={[s.sectionHeader, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
          <Text style={s.sectionTitle}>{t('pos.inventory')}</Text>
          <View style={[s.sectionActionsWrap, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            {isManagerLike && (
              <>
                <TouchableOpacity onPress={() => navigation.navigate('PosItemForm')}>
                  <Text style={s.sectionAction}>{t('pos.addItem')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('PosRestockForm')}>
                  <Text style={s.sectionAction}>{t('pos.restock')}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('PosSaleForm')}>
              <Text style={s.sectionAction}>{t('pos.newSale')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.inventoryList, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
          style={s.inventoryScroller}
        >
          {(itemsQuery.data || []).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.inventoryCard}
              activeOpacity={isManagerLike ? 0.8 : 1}
              onPress={() => {
                if (isManagerLike) navigation.navigate('PosItemForm', { itemId: item.id });
              }}
            >
              <View style={[s.rowLeft, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <View style={s.iconBadge}>
                  <MaterialCommunityIcons name="shopping-outline" size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { textAlign: rtl ? 'left' : 'right' }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[s.rowSub, { textAlign: rtl ? 'left' : 'right' }]} numberOfLines={1}>{item.sku} · {t(`pos.categories.${item.category}`, { defaultValue: item.category })}</Text>
                </View>
              </View>
              <View style={[s.inventoryFooter, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <Text style={s.rowAmount}>SAR {Number(item.unitPrice).toFixed(2)}</Text>
                <Text style={[s.rowSub, Number(item.quantity) <= 5 && { color: Colors.danger }]}>{t('pos.qtyValue', { value: Number(item.quantity).toFixed(2) })}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[s.sectionHeader, { marginTop: 18, flexDirection: rtl ? 'row' : 'row-reverse' }]}>
          <Text style={s.sectionTitle}>{t('pos.recentSales')}</Text>
        </View>
        {(salesQuery.data || []).slice(0, 12).map((sale) => (
          <View key={sale.id} style={[s.row, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <View style={[s.rowLeft, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
              <View style={s.iconBadge}>
                <MaterialCommunityIcons name={PAYMENT_ICONS[sale.paymentMethod] || 'cash'} size={16} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.itemsCount', { count: Number(sale.totalItems).toFixed(2) })}</Text>
                <Text style={[s.rowSub, { textAlign: rtl ? 'left' : 'right' }]}>{new Date(sale.createdAt).toLocaleString()}</Text>
              </View>
            </View>
            <Text style={s.rowAmount}>SAR {Number(sale.totalAmount).toFixed(2)}</Text>
          </View>
        ))}

        {isManagerLike && (
          <>
            <View style={[s.sectionHeader, { marginTop: 18, flexDirection: rtl ? 'row' : 'row-reverse' }]}>
              <Text style={s.sectionTitle}>{t('pos.recentRestocks')}</Text>
            </View>
            {(restocksQuery.data || []).slice(0, 12).map((restock) => (
              <View key={restock.id} style={[s.row, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <View style={[s.rowLeft, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                  <View style={s.iconBadge}>
                    <MaterialCommunityIcons name="package-variant-closed" size={16} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowTitle, { textAlign: rtl ? 'left' : 'right' }]}>{restock.itemName}</Text>
                    <Text style={[s.rowSub, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.restockQty', { qty: Number(restock.quantity).toFixed(2) })}</Text>
                  </View>
                </View>
                <View style={{ alignItems: rtl ? 'flex-end' : 'flex-start' }}>
                  <Text style={s.rowAmount}>SAR {Number(restock.totalCost).toFixed(2)}</Text>
                  <Text style={s.rowSub}>{new Date(restock.purchasedAt).toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[s.fab, rtl ? { end: 24 } : { start: 24 }]}
        onPress={() => navigation.navigate('PosSaleForm')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: Radii.lg, padding: 10 },
  kpiValue: { ...Typography.bodyMd, fontWeight: '800' },
  kpiLabel: { ...Typography.small },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 110, gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  sectionActionsWrap: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sectionAction: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  inventoryScroller: { marginBottom: 6 },
  inventoryList: { gap: 8, paddingHorizontal: 2 },
  inventoryCard: {
    width: 210,
    backgroundColor: '#fff',
    borderRadius: Radii.lg,
    padding: 12,
    gap: 8,
    ...Shadows.card,
  },
  inventoryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: {
    backgroundColor: '#fff',
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.card,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...Typography.bodyMd, fontWeight: '700' },
  rowSub: { ...Typography.small },
  rowAmount: { ...Typography.bodyMd, fontWeight: '700' },
  fab: {
    position: 'absolute',
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.strong,
  },
});
