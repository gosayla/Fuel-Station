import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DateTimeField } from '../../lib/DateTimeField';
import { showAlert } from '../../lib/alert';
import { api } from '../../lib/api';
import { Colors, Typography, Radii, Spacing } from '../../theme';

type PosItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type Account = {
  id: string;
  name: string;
  balance: number;
  type: 'safe' | 'bank' | 'credit';
};

type PosRestock = {
  id: string;
  posItemId: string;
  accountId: string;
  quantity: number;
  totalCost: number;
  itemName: string;
  purchasedAt: string;
};

export function PosRestockFormScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [itemId, setItemId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [purchasedAt, setPurchasedAt] = useState<Date>(new Date());

  const { data: items = [] } = useQuery({
    queryKey: ['pos-items'],
    queryFn: () => api.get('/pos/items').then((r) => r.data as PosItem[]),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then((r) => r.data as Account[]),
  });

  const selectedItem = useMemo(() => items.find((x) => x.id === itemId), [items, itemId]);
  const selectedAccount = useMemo(() => accounts.find((x) => x.id === accountId), [accounts, accountId]);

  const totalCost = (Number(quantity) || 0) * (Number(unitCost) || 0);

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/pos/restocks', payload).then((r) => r.data),
    onSuccess: (savedRestock: PosRestock) => {
      const addedQty = Number(savedRestock?.quantity ?? quantity);
      const targetItemId = savedRestock?.posItemId || itemId;
      const targetAccountId = savedRestock?.accountId || accountId;
      const paidCost = Number(savedRestock?.totalCost ?? totalCost);

      const patchItems = (current: PosItem[] | undefined) =>
        (current || []).map((entry) =>
          entry.id === targetItemId
            ? { ...entry, quantity: Number(entry.quantity) + addedQty }
            : entry,
        );

      queryClient.setQueryData<PosItem[]>(['pos-items'], patchItems);
      queryClient.setQueryData<PosItem[]>(['pos-items-all'], patchItems);

      queryClient.setQueryData<PosRestock[]>(['pos-restocks'], (current) => [savedRestock, ...(current || [])]);

      queryClient.setQueryData<Account[]>(['accounts'], (current) =>
        (current || []).map((entry) =>
          entry.id === targetAccountId
            ? { ...entry, balance: Number(entry.balance) - paidCost }
            : entry,
        ),
      );

      showAlert({ title: t('common.save'), message: t('pos.restockSaved'), variant: 'success' });
      navigation.goBack();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-restocks'] });
      queryClient.invalidateQueries({ queryKey: ['pos-items'] });
      queryClient.invalidateQueries({ queryKey: ['pos-items-all'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      showAlert({
        title: t('common.error'),
        message: Array.isArray(msg) ? msg.join('\n') : msg || t('pos.restockSaveFailed'),
        variant: 'error',
      });
    },
  });

  const handleSubmit = () => {
    const quantityNum = Number(quantity);
    const unitCostNum = Number(unitCost);

    if (!itemId) {
      showAlert({ title: t('common.error'), message: t('pos.selectItem'), variant: 'error' });
      return;
    }
    if (!accountId) {
      showAlert({ title: t('common.error'), message: t('common.selectAccount'), variant: 'error' });
      return;
    }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      showAlert({ title: t('common.error'), message: t('pos.invalidQuantity'), variant: 'error' });
      return;
    }
    if (!Number.isFinite(unitCostNum) || unitCostNum <= 0) {
      showAlert({ title: t('common.error'), message: t('pos.invalidUnitCost'), variant: 'error' });
      return;
    }

    mutation.mutate({
      itemId,
      accountId,
      quantity: quantityNum,
      unitCost: unitCostNum,
      supplierName: supplierName.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      purchasedAt: purchasedAt.toISOString(),
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, rtl ? { marginLeft: 8, marginRight: 0 } : { marginRight: 8, marginLeft: 0 }]}>
          <MaterialCommunityIcons name={rtl ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerLabel, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.headerLabel')}</Text>
          <Text style={[s.headerTitle, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.restock')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.block}>
          <Text style={[s.label, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.item')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.chipsRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            {items.map((item) => {
              const active = item.id === itemId;
              return (
                <TouchableOpacity key={item.id} style={[s.chip, active && s.chipActive]} onPress={() => setItemId(item.id)}>
                  <Text style={[s.chipTitle, active && s.chipTitleActive, { textAlign: rtl ? 'left' : 'right' }]}>{item.name}</Text>
                  <Text style={[s.chipSub, active && s.chipSubActive, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.qtyValue', { value: Number(item.quantity).toFixed(2) })}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('common.selectAccount')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.chipsRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            {accounts.map((account) => {
              const active = account.id === accountId;
              return (
                <TouchableOpacity key={account.id} style={[s.chip, active && s.chipActive]} onPress={() => setAccountId(account.id)}>
                  <Text style={[s.chipTitle, active && s.chipTitleActive, { textAlign: rtl ? 'left' : 'right' }]}>{account.name}</Text>
                  <Text style={[s.chipSub, active && s.chipSubActive, { textAlign: rtl ? 'left' : 'right' }]}>SAR {Number(account.balance).toFixed(2)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('pos.quantity')}</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('pos.unitCost')}</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={unitCost}
            onChangeText={setUnitCost}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('purchases.supplier')} ({t('common.optional')})</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={supplierName}
            onChangeText={setSupplierName}
            placeholder={t('purchases.form.supplierPlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('purchases.invoice')} ({t('common.optional')})</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder={t('purchases.form.invoicePlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('common.date')}</Text>
          <DateTimeField
            value={purchasedAt}
            onChange={setPurchasedAt}
            locale={i18n.language}
            title={t('expenses.pickDateTime', { defaultValue: 'Select date & time' })}
            confirmText={t('common.save')}
            cancelText={t('common.cancel')}
            containerStyle={[s.input, s.dateTrigger]}
            valueTextStyle={[s.dateText, { textAlign: rtl ? 'left' : 'right' }]}
          />

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('accounts.notes')} ({t('common.optional')})</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('accounts.form.reasonPlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />

          {(selectedItem || selectedAccount) && (
            <View style={s.summaryBox}>
              <Text style={[s.summaryText, { textAlign: rtl ? 'left' : 'right' }]}>{t('common.total')}: SAR {Number(totalCost).toFixed(2)}</Text>
              {selectedAccount && (
                <Text style={[s.summarySub, { textAlign: rtl ? 'left' : 'right' }]}>
                  {t('accounts.balance')}: SAR {Number(selectedAccount.balance).toFixed(2)}
                </Text>
              )}
              {selectedItem && (
                <Text style={[s.summarySub, { textAlign: rtl ? 'left' : 'right' }]}>
                  {t('pos.currentStock')}: {Number(selectedItem.quantity).toFixed(2)}
                </Text>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[s.submitBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          <Text style={s.submitText}>{mutation.isPending ? t('common.saving') : t('pos.restock')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  backBtn: { marginRight: 8, padding: 6 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 50, gap: 12 },
  block: { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg },
  label: { ...Typography.bodyMd, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  chipsRow: { gap: 8, paddingRight: 10 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 140,
    backgroundColor: Colors.bgCardAlt,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTitle: { ...Typography.smallBold, color: Colors.textPrimary },
  chipTitleActive: { color: Colors.primaryDark },
  chipSub: { ...Typography.small, marginTop: 2 },
  chipSubActive: { color: Colors.primaryDark },
  summaryBox: { marginTop: 12, backgroundColor: Colors.bgCardAlt, borderRadius: Radii.md, padding: 10 },
  summaryText: { ...Typography.bodyMd, fontWeight: '700', color: Colors.textPrimary },
  summarySub: { ...Typography.small, marginTop: 2 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
