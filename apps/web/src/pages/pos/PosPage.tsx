import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Package, TriangleAlert, DollarSign, ShoppingCart, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api';

interface PosItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
}

interface PosSale {
  id: string;
  paymentMethod: 'cash' | 'card' | 'credit';
  totalAmount: number;
  totalItems: number;
  createdAt: string;
}

interface PosRestock {
  id: string;
  itemName: string;
  quantity: number;
  totalCost: number;
  purchasedAt: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  credit: 'Credit',
};

export function PosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const isManagerLike = role === 'owner' || role === 'manager' || role === 'accountant';

  const itemsQuery = useQuery<PosItem[]>({
    queryKey: ['pos-items'],
    queryFn: () => api.get('/pos/items').then((response) => response.data),
    refetchInterval: 30_000,
  });

  const salesQuery = useQuery<PosSale[]>({
    queryKey: ['pos-sales'],
    queryFn: () => api.get('/pos/sales').then((response) => response.data),
    refetchInterval: 30_000,
  });

  const restocksQuery = useQuery<PosRestock[]>({
    queryKey: ['pos-restocks'],
    queryFn: () => api.get('/pos/restocks').then((response) => response.data),
    enabled: isManagerLike,
    refetchInterval: 30_000,
  });

  const items = itemsQuery.data || [];
  const sales = salesQuery.data || [];
  const restocks = restocksQuery.data || [];

  const stockValue = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0),
    [items],
  );
  const lowStockCount = items.filter((item) => Number(item.quantity) <= 5).length;

  const isRefreshing = itemsQuery.isFetching || salesQuery.isFetching || restocksQuery.isFetching;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('pos.headerTitle')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{t('pos.headerLabel')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              itemsQuery.refetch();
              salesQuery.refetch();
              restocksQuery.refetch();
            }}
            className="px-3 py-2 rounded-xl border border-border text-text-secondary hover:text-white hover:border-border-light text-sm flex items-center gap-2"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {t('common.retry')}
          </button>
          <button
            onClick={() => navigate('/pos/sales/new')}
            className="px-4 py-2.5 rounded-xl bg-primary text-bg-primary font-semibold text-sm hover:bg-primary/90"
          >
            {t('pos.newSale')}
          </button>
          {isManagerLike && (
            <button
              onClick={() => navigate('/pos/items/new')}
              className="px-4 py-2.5 rounded-xl bg-bg-card border border-border text-text-secondary hover:text-white hover:border-border-light font-semibold text-sm"
            >
              {t('pos.addItem')}
            </button>
          )}
          {isManagerLike && (
            <button
              onClick={() => navigate('/pos/restocks/new')}
              className="px-4 py-2.5 rounded-xl bg-bg-card border border-border text-text-secondary hover:text-white hover:border-border-light font-semibold text-sm"
            >
              {t('pos.restock')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide font-semibold">{t('pos.items')}</p>
          <p className="text-2xl font-bold text-white mt-1 flex items-center gap-2"><Package size={18} /> {items.length}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide font-semibold">{t('pos.lowStock')}</p>
          <p className="text-2xl font-bold text-warning mt-1 flex items-center gap-2"><TriangleAlert size={18} /> {lowStockCount}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide font-semibold">{t('pos.stockValue')}</p>
          <p className="text-2xl font-bold text-primary mt-1 flex items-center gap-2"><DollarSign size={18} /> SAR {stockValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{t('pos.inventory')}</h2>
          </div>
          <div className="max-h-[420px] overflow-auto">
            {itemsQuery.isLoading ? (
              <div className="p-5 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-10 bg-bg-secondary rounded-xl animate-pulse" />)}</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-sm text-text-muted text-center">{t('common.noData')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary text-xs uppercase">
                    <th className="text-left px-5 py-3">{t('pos.item')}</th>
                    <th className="text-right px-5 py-3">{t('pos.quantity')}</th>
                    <th className="text-right px-5 py-3">{t('common.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 last:border-b-0 hover:bg-bg-secondary/50">
                      <td className="px-5 py-3 text-white">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-text-muted">{item.sku} · {t(`pos.categories.${item.category}`, { defaultValue: item.category })}</p>
                          </div>
                          {isManagerLike && (
                            <Link to={`/pos/items/${item.id}`} className="text-xs text-primary hover:underline">
                              {t('common.edit')}
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={Number(item.quantity) <= 5 ? 'text-warning font-semibold' : 'text-text-secondary'}>
                          {Number(item.quantity).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-white">SAR {Number(item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{t('pos.recentSales')}</h2>
              <ShoppingCart size={16} className="text-primary" />
            </div>
            <div className="max-h-[200px] overflow-auto">
              {salesQuery.isLoading ? (
                <div className="p-5 space-y-3">{[1, 2].map((item) => <div key={item} className="h-10 bg-bg-secondary rounded-xl animate-pulse" />)}</div>
              ) : sales.length === 0 ? (
                <div className="p-5 text-sm text-text-muted text-center">{t('common.noData')}</div>
              ) : (
                sales.slice(0, 8).map((sale) => (
                  <div key={sale.id} className="px-5 py-3 border-b last:border-b-0 border-border/50 flex items-center justify-between text-sm">
                    <div>
                      <p className="text-white font-medium">{t('pos.itemsCount', { count: Number(sale.totalItems) })}</p>
                      <p className="text-text-muted text-xs">{new Date(sale.createdAt).toLocaleString()} · {t(`common.${sale.paymentMethod}`, { defaultValue: PAYMENT_LABELS[sale.paymentMethod] })}</p>
                    </div>
                    <p className="text-white font-semibold">SAR {Number(sale.totalAmount).toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {isManagerLike && (
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-white">{t('pos.recentRestocks')}</h2>
              </div>
              <div className="max-h-[200px] overflow-auto">
                {restocksQuery.isLoading ? (
                  <div className="p-5 space-y-3">{[1, 2].map((item) => <div key={item} className="h-10 bg-bg-secondary rounded-xl animate-pulse" />)}</div>
                ) : restocks.length === 0 ? (
                  <div className="p-5 text-sm text-text-muted text-center">{t('common.noData')}</div>
                ) : (
                  restocks.slice(0, 8).map((restock) => (
                    <div key={restock.id} className="px-5 py-3 border-b last:border-b-0 border-border/50 flex items-center justify-between text-sm">
                      <div>
                        <p className="text-white font-medium">{restock.itemName}</p>
                        <p className="text-text-muted text-xs">
                          {t('pos.restockQty', { qty: Number(restock.quantity).toFixed(2) })} · {new Date(restock.purchasedAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-white font-semibold">SAR {Number(restock.totalCost).toFixed(2)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
