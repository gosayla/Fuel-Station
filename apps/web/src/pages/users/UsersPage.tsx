import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
  UserPlus, Pencil, Trash2, X, RotateCcw, ShieldAlert,
  UserCog, Eye, EyeOff,
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

interface UserRecord {
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'manager' | 'accountant' | 'employee';
  isActive: boolean;
  pinLocked: boolean;
  createdAt: string;
}

const ROLE_BADGE: Record<string, string> = {
  owner:      'text-warning  bg-warning/10  border border-warning/20',
  manager:    'text-primary  bg-primary/10  border border-primary/20',
  accountant: 'text-teal     bg-teal/10     border border-teal/20',
  employee:   'text-text-secondary bg-bg-tertiary border border-border',
};

const userSchema = z.object({
  name:     z.string().min(2, 'Name required'),
  email:    z.string().email('Invalid email').or(z.literal('')).optional(),
  role:     z.enum(['owner', 'manager', 'accountant', 'employee']),
  password: z.string().min(8, 'Min 8 chars').or(z.literal('')).optional(),
  pin:      z.string().regex(/^\d{4}$/, '4 digits required').or(z.literal('')).optional(),
});
type UserForm = z.infer<typeof userSchema>;

// ── User Drawer (create / edit) ───────────────────────────────────────────────
function UserDrawer({
  editing,
  onClose,
}: {
  editing: UserRecord | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const authUser = useAuthStore(s => s.user);
  const isOwner = authUser?.role === 'owner';
  const [showPw, setShowPw] = useState(false);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: editing
      ? { name: editing.name, email: editing.email ?? '', role: editing.role }
      : { role: 'employee' },
  });

  const mutation = useMutation({
    mutationFn: (data: UserForm) => {
      // strip empty optional fields
      const payload: Record<string, any> = { name: data.name, role: data.role };
      if (data.email)    payload.email    = data.email;
      if (data.password) payload.password = data.password;
      if (data.pin)      payload.pin      = data.pin;
      if (!editing)      payload.stationId = (authUser as any)?.stationId;

      return editing
        ? api.patch(`/users/${editing.id}`, payload)
        : api.post('/users', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  const title = editing ? t('users.editUser') : t('users.addUser');

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 end-0 z-50 w-full sm:w-[420px] bg-bg-secondary border-s border-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCog size={18} className="text-primary" />
            </div>
            <p className="font-semibold text-white text-sm">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-bg-tertiary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(d => mutation.mutate(d))}
          className="flex-1 overflow-y-auto p-5 space-y-4"
        >
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              {t('users.form.fullName')} <span className="text-danger">*</span>
            </label>
            <input
              {...register('name')}
              placeholder={t('users.form.namePlaceholder')}
              className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              {t('auth.email')} <span className="text-text-muted font-normal">({t('common.optional')})</span>
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="user@example.com"
              className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
            {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              {t('common.role')} <span className="text-danger">*</span>
            </label>
            <select
              {...register('role')}
              disabled={!isOwner}
              className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary disabled:opacity-50"
            >
              <option value="employee">Employee</option>
              <option value="accountant">Accountant</option>
              <option value="manager">Manager</option>
              {isOwner && <option value="owner">Owner</option>}
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              {t('auth.password')} {editing ? <span className="text-text-muted font-normal">({t('users.form.passwordHint')})</span> : <span className="text-text-muted font-normal">({t('common.optional')})</span>}
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPw ? 'text' : 'password'}
                placeholder="Min 8 characters"
                className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 pe-10 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
          </div>

          {/* PIN */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              PIN {editing ? <span className="text-text-muted font-normal">({t('users.form.passwordHint')})</span> : <span className="text-text-muted font-normal">({t('users.form.pinHint')})</span>}
            </label>
            <input
              {...register('pin')}
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
            {errors.pin && <p className="text-danger text-xs mt-1">{errors.pin.message}</p>}
          </div>

          {mutation.isError && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-2.5">
              {(mutation.error as any)?.response?.data?.message ?? t('common.errorGeneric')}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-border flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary hover:text-white hover:border-white/20 transition-colors text-sm font-medium"
          >
          {t('common.close')}
          </button>
          <button
            onClick={handleSubmit(d => mutation.mutate(d))}
            disabled={isSubmitting || mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-primary text-bg-primary font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? t('common.saving') : editing ? t('common.saveChanges') : t('users.addUser')}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function UsersPage() {
  const qc = useQueryClient();
  const authUser = useAuthStore(s => s.user);
  const isOwner   = authUser?.role === 'owner';
  const isManager = authUser?.role === 'manager';
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';

  const [drawerUser, setDrawerUser] = useState<UserRecord | null | 'new'>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setConfirmDelete(null);
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/reset-pin`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('users.title')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{users.length} active user{users.length !== 1 ? 's' : ''}</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setDrawerUser('new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-bg-primary font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">{t('users.addUser')}</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted">
            <UserCog size={36} className="mb-2 opacity-30" />
            <p className="text-sm">{t('users.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-secondary">
                <tr>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>{t('common.name')}</th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide hidden md:table-cell`}>{t('common.email')}</th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>{t('common.role')}</th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide hidden sm:table-cell`}>{t('common.status')}</th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide hidden lg:table-cell`}>{t('users.joined')}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-bg-secondary/50 transition-colors">
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{u.name}</p>
                          {u.email && <p className="text-xs text-text-secondary md:hidden">{u.email}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5 text-text-secondary hidden md:table-cell">
                      {u.email ?? <span className="text-text-muted">—</span>}
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold capitalize', ROLE_BADGE[u.role])}>
                        {u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {u.pinLocked ? (
                        <span className="flex items-center gap-1.5 text-warning text-xs font-medium">
                          <ShieldAlert size={13} /> {t('users.status.pinLocked')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-success text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" /> {t('users.status.active')}
                        </span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5 text-text-secondary text-xs hidden lg:table-cell">
                      {format(new Date(u.createdAt), 'MMM d, yyyy')}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {/* Reset PIN lock */}
                        {u.pinLocked && (isOwner || isManager) && (
                          <button
                            onClick={() => resetPinMutation.mutate(u.id)}
                            disabled={resetPinMutation.isPending}
                            title={t('users.unlockPin')}
                            className="p-1.5 rounded-lg text-warning hover:bg-warning/10 transition-colors"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}

                        {/* Edit */}
                        {(isOwner || isManager) && (
                          <button
                            onClick={() => setDrawerUser(u)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-bg-tertiary transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                        )}

                        {/* Delete */}
                        {isOwner && u.id !== authUser?.id && (
                          confirmDelete === u.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deactivateMutation.mutate(u.id)}
                                disabled={deactivateMutation.isPending}
                                className="px-2.5 py-1 rounded-lg bg-danger text-white text-xs font-semibold hover:bg-danger/80 transition-colors"
                              >
                                {t('users.confirmDeactivate')}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-2.5 py-1 rounded-lg border border-border text-text-secondary text-xs hover:text-white transition-colors"
                              >
                                {t('common.close')}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(u.id)}
                              title={t('users.deactivate')}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerUser !== null && (
        <UserDrawer
          editing={drawerUser === 'new' ? null : drawerUser}
          onClose={() => setDrawerUser(null)}
        />
      )}
    </div>
  );
}
