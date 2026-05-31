import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../lib/api';
import { showAlert } from '../../lib/alert';
import { useAuthStore } from '../../store/auth.store';
import { Colors, Typography, Radii, Spacing, Shadows } from '../../theme';

export function ShiftStartScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const user = useAuthStore(s => s.user);
  const isManager = user?.role === 'manager' || user?.role === 'owner';

  const [openingCash, setOpeningCash] = useState('0');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null); // null = myself

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/users/employees').then(r => r.data),
    enabled: isManager,
  });

  const mutation = useMutation({
    mutationFn: (body: any) => api.post('/shifts/open', body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      navigation.goBack();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (err: any) => {
      showAlert({
        title: t('common.error'),
        message: err.response?.data?.message || t('common.error'),
        variant: 'error',
      });
    },
  });

  const handleSubmit = () => {
    const cash = parseFloat(openingCash);
    if (isNaN(cash) || cash < 0) {
      showAlert({ title: t('common.error'), message: t('common.invalidAmount'), variant: 'error' });
      return;
    }
    const body: any = { openingCash: cash };
    if (isManager && selectedEmployee) body.employeeId = selectedEmployee.id;
    mutation.mutate(body);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialCommunityIcons
            name={rtl ? 'arrow-right' : 'arrow-left'}
            size={24}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{t('shifts.openShift')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Employee picker for managers */}
        {isManager && (
          <View style={s.section}>
            <Text style={s.label}>{t('shifts.form.employee')}</Text>
            {empLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                {/* "Myself" option */}
                <TouchableOpacity
                  style={[s.chip, !selectedEmployee && s.chipActive]}
                  onPress={() => setSelectedEmployee(null)}
                >
                  <MaterialCommunityIcons
                    name="account"
                    size={14}
                    color={!selectedEmployee ? '#fff' : Colors.textMuted}
                  />
                  <Text style={[s.chipText, !selectedEmployee && s.chipTextActive]}>
                    {t('shifts.myself')}
                  </Text>
                </TouchableOpacity>

                {employees.map((emp: any) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[s.chip, selectedEmployee?.id === emp.id && s.chipActive]}
                    onPress={() => setSelectedEmployee(emp)}
                  >
                    <Text style={[s.chipText, selectedEmployee?.id === emp.id && s.chipTextActive]}>
                      {emp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Opening Cash */}
        <View style={s.section}>
          <Text style={s.label}>{t('shifts.form.openingCash')}</Text>
          <View style={s.inputRow}>
            <Text style={s.currency}>SAR</Text>
            <TextInput
              style={[s.input, { textAlign: rtl ? 'right' : 'left' }]}
              keyboardType="decimal-pad"
              value={openingCash}
              onChangeText={setOpeningCash}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="clock-start" size={18} color="#fff" />
              <Text style={s.submitText}>{t('shifts.opening')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bgPrimary },
  header:       {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: 12,
  },
  backBtn:      { padding: 4 },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  scroll:       { padding: Spacing.xl, gap: 20, paddingBottom: 60 },
  section:      { gap: 8 },
  label:        { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  chips:        { flexDirection: 'row', gap: 8 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radii.full, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.bgCardAlt, borderWidth: 1, borderColor: Colors.border },
  chipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:     { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  chipTextActive: { color: '#fff' },
  inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, ...Shadows.card },
  currency:     { paddingHorizontal: 14, fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  input:        { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.textPrimary, paddingVertical: 14, paddingHorizontal: 4 },
  submitBtn:    { marginTop: 8, backgroundColor: Colors.primary, borderRadius: Radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, ...Shadows.card },
  submitText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});
