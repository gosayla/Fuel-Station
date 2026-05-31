import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

const itemSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(1),
  category: z.enum(['engine_oil', 'cleaning_tools', 'accessories', 'other']),
  quantity: z.number().min(0),
  unitPrice: z.number().positive(),
  reorderLevel: z.number().min(0),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface PosItem {
  id: string;
  name: string;
  sku: string;
  category: 'engine_oil' | 'cleaning_tools' | 'accessories' | 'other';
  quantity: number;
  unitPrice: number;
  reorderLevel: number;
}

const CATEGORIES: Array<PosItem['category']> = ['engine_oil', 'cleaning_tools', 'accessories', 'other'];

export function PosItemForm() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams();
  const itemId = params.id;
  const role = useAuthStore((state) => state.user?.role);
  const canManage = role === 'owner' || role === 'manager' || role === 'accountant';

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      sku: '',
      category: 'other',
      quantity: 0,
      unitPrice: 0,
      reorderLevel: 0,
    },
  });

  const itemsQuery = useQuery<PosItem[]>({
    queryKey: ['pos-items'],
    queryFn: () => api.get('/pos/items').then((response) => response.data),
    enabled: Boolean(itemId),
  });

  const currentItem = itemId ? (itemsQuery.data || []).find((item) => item.id === itemId) : undefined;

  useEffect(() => {
    if (!currentItem) return;
    form.reset({
      name: currentItem.name,
      sku: currentItem.sku,
      category: currentItem.category,
      quantity: Number(currentItem.quantity),
      unitPrice: Number(currentItem.unitPrice),
      reorderLevel: Number(currentItem.reorderLevel),
    });
  }, [currentItem, form]);

  const mutation = useMutation({
    mutationFn: (values: ItemFormValues) => {
      if (itemId) {
        return api.patch(`/pos/items/${itemId}`, values);
      }
      return api.post('/pos/items', values);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos-items'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] }),
      ]);
      navigate('/pos');
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos-items'] }),
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
          <h1 className="text-2xl font-bold text-white">{itemId ? t('pos.editItem') : t('pos.addItem')}</h1>
          <p className="text-text-secondary text-sm mt-1">{t('pos.inventory')}</p>
        </div>

        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="bg-bg-card border border-border rounded-2xl p-5 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">{t('pos.name')}</label>
              <input className="input w-full" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-danger mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">{t('pos.sku')}</label>
              <input className="input w-full" {...form.register('sku')} />
              {form.formState.errors.sku && <p className="text-xs text-danger mt-1">{form.formState.errors.sku.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">{t('pos.category')}</label>
              <select className="input w-full" {...form.register('category')}>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t(`pos.categories.${category}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">{t('pos.quantity')}</label>
              <input
                type="number"
                step="0.01"
                className="input w-full"
                {...form.register('quantity', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">{t('pos.unitPrice')}</label>
              <input
                type="number"
                step="0.01"
                className="input w-full"
                {...form.register('unitPrice', { valueAsNumber: true })}
              />
              {form.formState.errors.unitPrice && <p className="text-xs text-danger mt-1">{form.formState.errors.unitPrice.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">{t('pos.reorderLevel')}</label>
              <input
                type="number"
                step="0.01"
                className="input w-full"
                {...form.register('reorderLevel', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button type="button" onClick={() => navigate('/pos')} className="px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-white">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={mutation.isPending || itemsQuery.isLoading} className="px-4 py-2 rounded-xl bg-primary text-bg-primary font-semibold disabled:opacity-60">
              {mutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
