import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import { Colors, Radii, Spacing, Shadows } from '../../theme';

type Expense = {
  id: string;
  accountId: string;
  category: string;
  description: string;
  amount: number;
  paidAt: string;
};

type Account = {
  id: string;
  name: string;
};

export function ExpensesScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();

  const {
    data: expenses = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.get('/expenses').then((r) => r.data as Expense[]),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then((r) => r.data as Account[]),
  });

  const accountMap = React.useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  const totalToday = expenses
    .filter((e) => format(new Date(e.paidAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalAll = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={[s.headerLabel, { textAlign: rtl ? 'left' : 'right' }]}>{t('nav.expenses').toUpperCase()}</Text>
        <Text style={[s.headerTitle, { textAlign: rtl ? 'left' : 'right' }]}>{t('expenses.title')}</Text>
      </View>

      {!isLoading && (
        <View style={[s.kpiRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{expenses.length}</Text>
            <Text style={s.kpiLabel}>{t('expenses.totalCount')}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>SAR {totalToday.toFixed(2)}</Text>
            <Text style={s.kpiLabel}>{t('expenses.today')}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>SAR {totalAll.toFixed(2)}</Text>
            <Text style={s.kpiLabel}>{t('expenses.total')}</Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : expenses.length === 0 ? (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons name="receipt" size={56} color={Colors.textMuted} />
            <Text style={s.emptyTitle}>{t('expenses.empty')}</Text>
            <Text style={s.emptySub}>{t('expenses.emptyHint')}</Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={s.card}>
              <View style={[s.row, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <View style={s.iconWrap}>
                  <MaterialCommunityIcons name="receipt" size={16} color={Colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.title, { textAlign: rtl ? 'left' : 'right' }]} numberOfLines={1}>
                    {expense.description}
                  </Text>
                  <Text style={[s.sub, { textAlign: rtl ? 'left' : 'right' }]}>
                    {t(`expenses.categories.${expense.category}`, { defaultValue: expense.category })}
                  </Text>
                </View>
                <View>
                  <Text style={s.amount}>SAR {Number(expense.amount).toFixed(2)}</Text>
                  <Text style={[s.sub, { textAlign: rtl ? 'left' : 'right' }]}>{format(new Date(expense.paidAt), 'MMM d, yyyy')}</Text>
                </View>
              </View>
              <View style={[s.metaRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <Text style={[s.metaText, { textAlign: rtl ? 'left' : 'right' }]}>{t('expenses.paidFrom')}: {accountMap.get(expense.accountId) || '—'}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[s.fab, rtl ? { end: 24 } : { start: 24 }]}
        onPress={() => navigation.navigate('ExpenseForm')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: Radii.lg, padding: 10 },
  kpiValue: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  kpiLabel: { fontSize: 11, color: Colors.textMuted },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 96, gap: 10 },
  emptyWrap: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { marginTop: 6, textAlign: 'center', color: Colors.textMuted, fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    gap: 8,
    ...Shadows.card,
  },
  row: { alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  metaRow: { justifyContent: 'space-between' },
  metaText: { fontSize: 11, color: Colors.textSecondary },
  fab: {
    position: 'absolute',
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.strong,
  },
});
