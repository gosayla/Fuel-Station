import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

interface PosItem {
  id: string;
  name: string;
  sku: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
}

const restockSchema = z.object({
  itemId: z.string().min(1),
  accountId: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().positive(),
  purchasedAt: z.string().min(1),
  notes: z.string().optional(),
});

type RestockFormValues = z.infer<typeof restockSchema>;

function toDatetimeLocal(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PosRestockForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const canManage = role === 'owner' || role === 'manager' || role === 'accountant';

  const itemsQuery = useQuery<PosItem[]>({
    queryKey: ['pos-items'],
    queryFn: () => api.get('/pos/items').then((response) => response.data),
  });

  const accountsQuery = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then((response) => response.data),
  });

  const form = useForm<RestockFormValues>({
    resolver: zodResolver(restockSchema),
    defaultValues: {
      itemId: '',
      accountId: '',
      quantity: 1,
      unitCost: 0,
      purchasedAt: toDatetimeLocal(),
      notes: '',
    },
  });

  const quantity = Number(form.watch('quantity') || 0);
  const unitCost = Number(form.watch('unitCost') || 0);
  const totalCost = quantity * unitCost;

  const mutation = useMutation({
    mutationFn: (values: RestockFormValues) =>
      api.post('/pos/restocks', {
        itemId: values.itemId,
        accountId: values.accountId,
        quantity: values.quantity,
        unitCost: values.unitCost,
        purchasedAt: new Date(values.purchasedAt).toISOString(),
        notes: values.notes,
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos-items'] }),
        queryClient.invalidateQueries({ queryKey: ['pos-restocks'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] }),
      ]);
      navigate('/pos');
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos-items'] }),
        queryClient.invalidateQueries({ queryKey: ['pos-restocks'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] }),
      ]);
    },
  });

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="bg-bg-card border border-border rounded-2xl p-6 text-center text-text-muted text-sm">{t('common.notAllowed')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('pos.restock')}</h1>
          <p className="text-text-secondary text-sm mt-1">{t('pos.recentRestocks')}</p>
        </div>

        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">{t('pos.item')}</label>
            <select className="input w-full" {...form.register('itemId')}>
              <option value="">{t('common.select')}</option>
              {(itemsQuery.data || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">{t('accounts.title')}</label>
            <select className="input w-full" {...form.register('accountId')}>
              <option value="">{t('common.select')}</option>
              {(accountsQuery.data || []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({Number(account.balance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">{t('pos.quantity')}</label>
              <input type="number" step="0.01" className="input w-full" {...form.register('quantity', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">{t('pos.unitCost')}</label>
              <input type="number" step="0.01" className="input w-full" {...form.register('unitCost', { valueAsNumber: true })} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">{t('common.date')}</label>
            <input type="datetime-local" className="input w-full" {...form.register('purchasedAt')} />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">{t('accounts.notes')}</label>
            <textarea rows={3} className="input w-full resize-none" {...form.register('notes')} />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-text-secondary">
              {t('common.total')}: <span className="text-white font-semibold">SAR {totalCost.toFixed(2)}</span>
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/pos')} className="px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-white">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-xl bg-primary text-bg-primary font-semibold disabled:opacity-60">
                {mutation.isPending ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
