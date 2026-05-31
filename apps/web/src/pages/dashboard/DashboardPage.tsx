import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Fuel, TrendingUp, TrendingDown, Wallet, Users, AlertTriangle, DollarSign } from 'lucide-react';
import clsx from 'clsx';

function KpiCard({ label, value, sub, icon: Icon, color = 'primary', trend }: {
  label: string; value: string | number; sub?: string;
  icon: any; color?: 'primary' | 'success' | 'warning' | 'danger' | 'teal';
  trend?: number;
}) {
  const colors = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-danger bg-danger/10',
    teal: 'text-teal bg-teal/10',
  };
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 hover:border-border-light transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', colors[color])}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={clsx('text-xs font-semibold flex items-center gap-0.5', trend >= 0 ? 'text-success' : 'text-danger')}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => api.get('/reports/dashboard', { params: { version: 'v2' } }).then(r => r.data),
    refetchInterval: 30_000,
  });

  const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-success/10 border border-success/20 text-success text-xs font-medium px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          {t('dashboard.liveStatus')}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label={t('dashboard.revenue')} value={isLoading ? '—' : fmt(kpis?.totalSalesToday ?? 0)} icon={DollarSign} color="primary" />
        <KpiCard label={t('dashboard.litersToday')} value={isLoading ? '—' : `${(kpis?.totalLitersSoldToday ?? 0).toFixed(0)} L`} icon={Fuel} color="teal" />
        <KpiCard label={t('dashboard.netProfit')} value={isLoading ? '—' : fmt(kpis?.netProfitToday ?? 0)} icon={TrendingUp} color="success" />
        <KpiCard label={t('dashboard.expenses')} value={isLoading ? '—' : fmt(kpis?.totalExpensesToday ?? 0)} icon={TrendingDown} color="danger" />
      </div>

      {/* Account Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center">
              <Wallet size={18} className="text-teal" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('accounts.safe')}</p>
              <p className="text-xs text-text-secondary">{t('dashboard.cashOnHand')}</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{isLoading ? '—' : fmt(kpis?.safeBalance ?? 0)}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('accounts.bank')}</p>
              <p className="text-xs text-text-secondary">{t('dashboard.bankAccount')}</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{isLoading ? '—' : fmt(kpis?.bankBalance ?? 0)}</p>
        </div>
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <Users size={20} className="text-warning" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{isLoading ? '—' : kpis?.openShiftsCount ?? 0}</p>
            <p className="text-sm text-text-secondary">{t('dashboard.openShifts')}</p>
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{isLoading ? '—' : kpis?.lowTanksCount ?? 0}</p>
            <p className="text-sm text-text-secondary">{t('dashboard.lowTanks')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
