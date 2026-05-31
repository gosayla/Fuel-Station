import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TanksPage } from './pages/tanks/TanksPage';
import { SalesPage } from './pages/sales/SalesPage';
import { ShiftsPage } from './pages/shifts/ShiftsPage';
import { ShiftDetailPage } from './pages/shifts/ShiftDetailPage';
import { PurchasesPage } from './pages/purchases/PurchasesPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { UsersPage } from './pages/users/UsersPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { PosPage } from './pages/pos/PosPage';
import { PosItemForm } from './pages/pos/PosItemForm';
import { PosSaleForm } from './pages/pos/PosSaleForm';
import { PosRestockForm } from './pages/pos/PosRestockForm';
import { PinLoginPage } from './pages/auth/PinLoginPage';
import { LanguageWrapper } from './components/LanguageWrapper';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <LanguageWrapper>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pin-login" element={<PinLoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tanks" element={<TanksPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="pos/items/new" element={<PosItemForm />} />
            <Route path="pos/items/:id" element={<PosItemForm />} />
            <Route path="pos/sales/new" element={<PosSaleForm />} />
            <Route path="pos/restocks/new" element={<PosRestockForm />} />
            <Route path="shifts" element={<ShiftsPage />} />
            <Route path="shifts/:id" element={<ShiftDetailPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageWrapper>
  );
}
