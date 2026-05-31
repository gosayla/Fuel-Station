import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DateTimeField } from '../../lib/DateTimeField';
import { showAlert } from '../../lib/alert';
import { api } from '../../lib/api';
import { Colors, Radii, Spacing } from '../../theme';

type Account = {
  id: string;
  name: string;
  balance: number;
  type: 'safe' | 'bank' | 'credit';
};

type Category = 'salary' | 'utilities' | 'maintenance' | 'fuel_purchase' | 'office_supplies' | 'cleaning_supplies' | 'other';

const CATEGORIES: Category[] = [
  'salary',
  'utilities',
  'maintenance',
  'fuel_purchase',
  'office_supplies',
  'cleaning_supplies',
  'other',
];

export function ExpenseFormScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [accountId, setAccountId] = useState<string>('');
  const [category, setCategory] = useState<Category>('other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState<Date>(new Date());

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then((r) => r.data as Account[]),
  });

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId),
    [accounts, accountId],
  );

  const mutation = useMutation({
    mutationFn: (body: object) => api.post('/expenses', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      showAlert({ title: t('common.save'), message: t('expenses.saved'), variant: 'success' });
      navigation.goBack();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      showAlert({
        title: t('common.error'),
        message: Array.isArray(msg) ? msg.join('\n') : msg || t('expenses.saveFailed'),
        variant: 'error',
      });
    },
  });

  const handleSubmit = () => {
    const amountNum = Number(amount);

    if (!accountId) {
      showAlert({ title: t('common.error'), message: t('common.selectAccount'), variant: 'error' });
      return;
    }
    if (!description.trim()) {
      showAlert({ title: t('common.error'), message: t('expenses.descriptionRequired'), variant: 'error' });
      return;
    }
    if (!amountNum || amountNum <= 0) {
      showAlert({ title: t('common.error'), message: t('expenses.invalidAmount'), variant: 'error' });
      return;
    }

    mutation.mutate({
      accountId,
      category,
      description: description.trim(),
      amount: amountNum,
      paidAt: paidAt.toISOString(),
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, rtl ? { marginLeft: 8, marginRight: 0 } : { marginRight: 8, marginLeft: 0 }]}>
          <MaterialCommunityIcons name={rtl ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerLabel, { textAlign: rtl ? 'left' : 'right' }]}>{t('expenses.addExpense').toUpperCase()}</Text>
          <Text style={[s.headerTitle, { textAlign: rtl ? 'left' : 'right' }]}>{t('expenses.addExpense')}</Text>
        </View>
      </View>

      {accountsLoading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 28 }} />}

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.block}>
          <Text style={[s.label, { textAlign: rtl ? 'left' : 'right' }]}>{t('common.selectAccount')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.chipsRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            {accounts.map((account) => {
              const active = account.id === accountId;
              return (
                <TouchableOpacity
                  key={account.id}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setAccountId(account.id)}
                >
                  <Text style={[s.chipTitle, active && s.chipTitleActive, { textAlign: rtl ? 'left' : 'right' }]}>{account.name}</Text>
                  <Text style={[s.chipSub, active && s.chipSubActive, { textAlign: rtl ? 'left' : 'right' }]}>
                    {t(`accounts.types.${account.type}`)} · SAR {Number(account.balance).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {selectedAccount && (
            <Text style={[s.balanceHint, { textAlign: rtl ? 'left' : 'right' }]}>
              {t('accounts.balance')}: SAR {Number(selectedAccount.balance).toFixed(2)}
            </Text>
          )}
        </View>

        <View style={s.block}>
          <Text style={[s.label, { textAlign: rtl ? 'left' : 'right' }]}>{t('expenses.category')}</Text>
          <View style={[s.wrapRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            {CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[s.smallChip, active && s.smallChipActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[s.smallChipText, active && s.smallChipTextActive, { textAlign: rtl ? 'left' : 'right' }]}>
                    {t(`expenses.categories.${item}`, { defaultValue: item })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.block}>
          <Text style={[s.label, { textAlign: rtl ? 'left' : 'right' }]}>{t('expenses.description')}</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('expenses.descriptionPlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[s.label, { marginTop: 12, textAlign: rtl ? 'left' : 'right' }]}>{t('expenses.amount')}</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[s.label, { marginTop: 12, textAlign: rtl ? 'left' : 'right' }]}>{t('expenses.paidAt')}</Text>
          <DateTimeField
            value={paidAt}
            onChange={setPaidAt}
            locale={i18n.language}
            title={t('expenses.pickDateTime', { defaultValue: 'Select date & time' })}
            confirmText={t('common.save')}
            cancelText={t('common.cancel')}
            containerStyle={[s.input, s.dateTrigger]}
            valueTextStyle={[s.dateTriggerText, { textAlign: rtl ? 'left' : 'right' }]}
          />
          <Text style={[s.inputHint, { textAlign: rtl ? 'left' : 'right' }]}>{t('expenses.tapToChangeDateTime', { defaultValue: 'Tap to pick date & time' })}</Text>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          <Text style={s.submitText}>{mutation.isPending ? t('common.saving') : t('expenses.addExpense')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backBtn: { marginRight: 8, padding: 6 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 48, gap: 12 },
  block: { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  chipsRow: { gap: 8, paddingRight: 10 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 150,
    backgroundColor: Colors.bgCardAlt,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTitle: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  chipTitleActive: { color: Colors.primaryDark },
  chipSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  chipSubActive: { color: Colors.primaryDark },
  balanceHint: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.bgCardAlt,
  },
  smallChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  smallChipText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  smallChipTextActive: { color: Colors.primaryDark },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTriggerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  inputHint: { marginTop: 6, fontSize: 11, color: Colors.textMuted },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
