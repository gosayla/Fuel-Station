import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, FlatList, I18nManager, StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Radii, Spacing, Shadows } from '../../theme';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { showAlert } from '../../lib/alert';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';

// In RTL mode flex-row flows right→left, so we reverse each group of 3
// to cancel out the mirroring and keep 1-2-3 visually left to right.
const PIN_KEYS = ['3','2','1','6','5','4','9','8','7','✓','0','⌫']

export function PinLoginScreen({ navigation }: any) {
  const { t } = useTranslation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees-pin'],
    queryFn: () => api.get('/auth/employees').then(r => r.data),
  });

  const handleKey = (key: string) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (key === '✓') { handleSubmit(); return; }
    if (pin.length < 4) setPin(p => p + key);
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || pin.length !== 4) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/pin-login', { employeeId: selectedEmployee.id, pin });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    } catch (e: any) {
      showAlert({ title: t('common.error'), message: e.response?.data?.message || 'Incorrect PIN', variant: 'error' });
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
    <StatusBar backgroundColor={Colors.bgPrimary} barStyle="dark-content" />
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons
            name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}
            size={22}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>{t('auth.pinLogin').toUpperCase()}</Text>
          <Text style={styles.headerTitle}>{t('auth.pinLogin')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Employee selector */}
        <Text style={styles.sectionTitle}>{t('auth.selectName').toUpperCase()}</Text>
        {isLoading ? (
          <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>{t('common.loading')}</Text>
        ) : (
          <View style={styles.employeeGrid}>
            {employees.map((emp: any) => (
              <TouchableOpacity
                key={emp.id}
                style={[styles.empCard, selectedEmployee?.id === emp.id && styles.empCardActive]}
                onPress={() => { setSelectedEmployee(emp); setPin(''); }}
                activeOpacity={0.8}
              >
                <View style={[styles.empAvatar, selectedEmployee?.id === emp.id && { backgroundColor: Colors.primaryLight }]}>
                  <Text style={[styles.empAvatarText, selectedEmployee?.id === emp.id && { color: Colors.primary }]}>
                    {emp.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.empName, selectedEmployee?.id === emp.id && { color: Colors.primary }]} numberOfLines={1}>{emp.name}</Text>
                {emp.pinLocked && <Text style={styles.lockedBadge}>Locked</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* PIN pad */}
        {selectedEmployee && (
          <View style={styles.pinSection}>
            <Text style={styles.sectionTitle}>{t('auth.enterPin').toUpperCase()}</Text>
            {/* Dots */}
            <View style={styles.dotsRow}>
              {[0,1,2,3].reverse().map(i => (
                <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
              ))}
            </View>
            {/* Keypad */}
            <View style={styles.keypad}>
              {PIN_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.key, key === '✓' && styles.keyConfirm, key === '⌫' && styles.keyDelete]}
                  onPress={() => handleKey(key)}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.keyText, key === '✓' && styles.keyConfirmText]}>
                    {loading && key === '✓' ? '...' : key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </View>
  );
}

const KEY_SIZE = 70;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  scroll: { padding: Spacing.xl, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: Spacing.lg },
  employeeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.xl },
  empCard: { width: '45%', backgroundColor: Colors.bgCard, borderRadius: Radii.lg, padding: Spacing.lg, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  empCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  empAvatar: { width: 48, height: 48, borderRadius: Radii.full, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  empAvatarText: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  empName: { ...Typography.bodyMd, textAlign: 'center' },
  lockedBadge: { fontSize: 10, color: Colors.danger, fontWeight: '600', marginTop: 2 },
  pinSection: { alignItems: 'center' },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: Spacing.xl },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.border },
  dotFilled: { backgroundColor: Colors.primary },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: KEY_SIZE * 3 + Spacing.md * 2, justifyContent: 'center', gap: Spacing.md },
  key: { width: KEY_SIZE, height: KEY_SIZE, borderRadius: Radii.full, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  keyConfirm: { backgroundColor: Colors.primary, ...Shadows.strong, shadowColor: Colors.primary, shadowOpacity: 0.35 },
  keyDelete: { backgroundColor: Colors.bgCardAlt },
  keyText: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  keyConfirmText: { color: Colors.textWhite },
});
