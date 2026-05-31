import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.store';
import { Colors, Shadows } from '../theme';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { PinLoginScreen } from '../screens/auth/PinLoginScreen';

// App Screens
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TanksScreen } from '../screens/tanks/TanksScreen';
import { SalesScreen } from '../screens/sales/SalesScreen';
import { ShiftsScreen } from '../screens/shifts/ShiftsScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EmployeesScreen } from '../screens/employees/EmployeesScreen';
import { EmployeeFormScreen } from '../screens/employees/EmployeeFormScreen';
import { SaleFormScreen } from '../screens/sales/SaleFormScreen';
import { ShiftDetailScreen } from '../screens/shifts/ShiftDetailScreen';
import { ShiftStartScreen } from '../screens/shifts/ShiftStartScreen';
import { ShiftCloseScreen } from '../screens/shifts/ShiftCloseScreen';
import { CollectShiftScreen } from '../screens/shifts/CollectShiftScreen';
import { TankFormScreen } from '../screens/tanks/TankFormScreen';
import { PurchasesScreen } from '../screens/purchases/PurchasesScreen';
import { PurchaseFormScreen } from '../screens/purchases/PurchaseFormScreen';
import { PosScreen } from '../screens/pos/PosScreen';
import { PosSaleFormScreen } from '../screens/pos/PosSaleFormScreen';
import { PosItemFormScreen } from '../screens/pos/PosItemFormScreen';
import { PosRestockFormScreen } from '../screens/pos/PosRestockFormScreen';
import { ExpensesScreen } from '../screens/expenses/ExpensesScreen';
import { ExpenseFormScreen } from '../screens/expenses/ExpenseFormScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

type TabDef = { icon: string; activeIcon: string; labelKey: string };

const TABS: Record<string, TabDef> = {
  Dashboard: { icon: 'home-outline',         activeIcon: 'home',             labelKey: 'nav.dashboard' },
  Tanks:     { icon: 'gas-station-outline',   activeIcon: 'gas-station',      labelKey: 'nav.tanks'     },
  Sales:     { icon: 'shopping-outline',      activeIcon: 'shopping',         labelKey: 'nav.sales'     },
  Pos:       { icon: 'point-of-sale',         activeIcon: 'point-of-sale',    labelKey: 'nav.pos'       },
  Expenses:  { icon: 'receipt',               activeIcon: 'receipt',           labelKey: 'nav.expenses'  },
  Shifts:    { icon: 'clock-outline',         activeIcon: 'clock',            labelKey: 'nav.shifts'    },
  Accounts:  { icon: 'bank-outline',          activeIcon: 'bank',             labelKey: 'nav.accounts'  },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const isEmployee = useAuthStore((s) => s.user?.role === 'employee');
  const visibleRoutes = state.routes.filter(
    (r) => !(isEmployee && r.name === 'Accounts'),
  );
  return (
    <View style={s.bar}>
      <View style={[s.row, { flexDirection: !rtl ? 'row-reverse' : 'row' }]}>
        {visibleRoutes.map((route) => {
          const focused = state.routes[state.index].name === route.name;
          const tab = TABS[route.name];
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={s.item}>
              {focused && <View style={s.indicator} />}
              <MaterialCommunityIcons
                name={focused ? tab.activeIcon : tab.icon}
                size={24}
                color={focused ? Colors.primary : Colors.navInactive}
              />
              <Text style={[s.label, focused && s.labelActive]}>{t(tab.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function TabNavigator() {
  const isEmployee = useAuthStore((s) => s.user?.role === 'employee');
  return (
    <Tab.Navigator
      tabBar={(p) => <CustomTabBar {...p} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tanks"     component={TanksScreen}     />
      <Tab.Screen name="Sales"     component={SalesScreen}     />
      <Tab.Screen name="Pos"       component={PosScreen}       />
      {!isEmployee && <Tab.Screen name="Expenses" component={ExpensesScreen} />}
      <Tab.Screen name="Shifts"    component={ShiftsScreen}    />
      {!isEmployee && <Tab.Screen name="Accounts"  component={AccountsScreen}  />}
    </Tab.Navigator>
  );
}

export function AppNavigator({ onNavigationStateChange }: { onNavigationStateChange?: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = React.useState(
    () => useAuthStore.persist.hasHydrated(),
  );

  React.useEffect(() => {
    if (hydrated) return;
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // Double-check in case hydration finished between render and effect
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <NavigationContainer onStateChange={onNavigationStateChange}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <>
            <Stack.Screen name="Login"    component={LoginScreen}    />
            <Stack.Screen name="PinLogin" component={PinLoginScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main"         component={TabNavigator}      />
            <Stack.Screen name="Profile"      component={ProfileScreen}     />
            <Stack.Screen name="Employees"    component={EmployeesScreen}   />
            <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
            <Stack.Screen name="SaleForm"     component={SaleFormScreen}    />
            <Stack.Screen name="ShiftDetail"  component={ShiftDetailScreen} />
            <Stack.Screen name="ShiftStart"   component={ShiftStartScreen}  />
            <Stack.Screen name="ShiftClose"    component={ShiftCloseScreen}    />
            <Stack.Screen name="CollectShift" component={CollectShiftScreen} />
            <Stack.Screen name="TankForm"      component={TankFormScreen}     />
            <Stack.Screen name="Purchases"     component={PurchasesScreen}    />
            <Stack.Screen name="PurchaseForm"  component={PurchaseFormScreen} />
            <Stack.Screen name="ExpenseForm"   component={ExpenseFormScreen}  />
            <Stack.Screen name="PosSaleForm"   component={PosSaleFormScreen}  />
            <Stack.Screen name="PosItemForm"   component={PosItemFormScreen}  />
            <Stack.Screen name="PosRestockForm" component={PosRestockFormScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border ?? '#EBEBEB',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    ...Shadows.card,
  },
  row: {
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    gap: 4,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.navInactive,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});

