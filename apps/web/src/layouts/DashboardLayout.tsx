import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.store';
import {
  LayoutDashboard, Fuel, ShoppingCart, Users, Wallet,
  BarChart3, LogOut, Fuel as FuelIcon, Truck, Menu, X, UserCog,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard', roles: null },
  { key: 'tanks',     icon: Fuel,            path: '/tanks',     roles: null },
  { key: 'sales',     icon: ShoppingCart,    path: '/sales',     roles: null },
  { key: 'purchases', icon: Truck,           path: '/purchases', roles: null },
  { key: 'shifts',    icon: Users,           path: '/shifts',    roles: null },
  { key: 'accounts',  icon: Wallet,          path: '/accounts',  roles: null },
  { key: 'reports',   icon: BarChart3,       path: '/reports',   roles: null },
  { key: 'users',     icon: UserCog,         path: '/users',     roles: ['owner', 'manager'] },
];

export function DashboardLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">

      {/* ── Mobile backdrop ─────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* ── Sidebar (drawer on mobile, static on md+) ───────────────── */}
      <aside
        className={clsx(
          'fixed md:relative inset-y-0 start-0 z-50 w-64 bg-bg-secondary border-e border-border flex flex-col shrink-0 transition-transform duration-300 ease-in-out',
          drawerOpen ? 'translate-x-0' : 'max-md:ltr:-translate-x-full max-md:rtl:translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="p-5 md:p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <FuelIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">FuelStation</p>
              <p className="text-xs text-text-secondary">Pro</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={closeDrawer}
            className="md:hidden p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-bg-tertiary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(item => !item.roles || item.roles.includes(user?.role ?? '')).map(({ key, icon: Icon, path }) => (
            <NavLink
              key={key}
              to={path}
              onClick={closeDrawer}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-text-secondary hover:text-white hover:bg-bg-tertiary',
                )
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <Link
            to="/profile"
            onClick={closeDrawer}
            className="flex items-center gap-3 mb-3 px-2 py-1.5 rounded-xl hover:bg-bg-tertiary transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">{user?.name}</p>
              <p className="text-xs text-text-secondary capitalize">{user?.role}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:text-danger hover:bg-danger/10 transition-all"
          >
            <LogOut size={16} />
            {t('auth.signOut')}
          </button>
        </div>
      </aside>

      {/* ── Content area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <FuelIcon className="w-4 h-4 text-primary" />
            </div>
            <p className="font-bold text-white text-sm">FuelStation</p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-bg-tertiary transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
