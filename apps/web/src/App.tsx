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
            <Route path="shifts" element={<ShiftsPage />} />
            <Route path="shifts/:id" element={<ShiftDetailPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
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
