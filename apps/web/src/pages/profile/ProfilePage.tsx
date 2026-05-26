import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { LANGUAGE_OPTIONS } from '@fuel-station/shared';
import { User, Lock, KeyRound, Globe, CheckCircle, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

// ── Schemas ───────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name:  z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
});

const passwordSchema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, '4 digits required'),
});

type ProfileForm  = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type PinForm      = z.infer<typeof pinSchema>;

// ── Reusable success banner ───────────────────────────────────────────────────
function SavedBanner({ show }: { show: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'flex items-center gap-2 text-success text-sm font-medium transition-all duration-300',
        show ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      <CheckCircle size={15} /> {t('profile.saved')}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-secondary">
          {icon}
        </div>
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();

  const [profileSaved,  setProfileSaved]  = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [pinSaved,      setPinSaved]      = useState(false);
  const [showPw,        setShowPw]        = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);

  const flash = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 2500);
  };

  // ── Profile form ────────────────────────────────────────────────────────────
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });
  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => {
      const payload: Record<string, any> = { name: data.name };
      if (data.email) payload.email = data.email;
      return api.patch(`/users/${user?.id}`, payload).then(r => r.data);
    },
    onSuccess: (updated) => {
      // update auth store so sidebar name refreshes
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, name: updated.name, email: updated.email }, accessToken, refreshToken);
      }
      flash(setProfileSaved);
    },
  });

  // ── Password form ───────────────────────────────────────────────────────────
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      api.patch(`/users/${user?.id}`, { password: data.password }),
    onSuccess: () => {
      passwordForm.reset();
      flash(setPasswordSaved);
    },
  });

  // ── PIN form ────────────────────────────────────────────────────────────────
  const pinForm = useForm<PinForm>({ resolver: zodResolver(pinSchema) });
  const pinMutation = useMutation({
    mutationFn: (data: PinForm) =>
      api.patch(`/users/${user?.id}`, { pin: data.pin }),
    onSuccess: () => {
      pinForm.reset();
      flash(setPinSaved);
    },
  });

  const ROLE_BADGE: Record<string, string> = {
    owner:      'text-warning  bg-warning/10  border-warning/20',
    manager:    'text-primary  bg-primary/10  border-primary/20',
    accountant: 'text-teal     bg-teal/10     border-teal/20',
    employee:   'text-text-secondary bg-bg-tertiary border-border',
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('profile.title')}</h1>
        <p className="text-text-secondary text-sm mt-0.5">{t('profile.subtitle')}</p>
      </div>

      {/* Avatar + role strip */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center text-primary text-2xl font-bold shrink-0">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-bold text-white">{user?.name}</p>
          {user?.email && <p className="text-text-secondary text-sm">{user.email}</p>}
          <span className={clsx('inline-block mt-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold capitalize border', ROLE_BADGE[user?.role ?? 'employee'])}>
            {user?.role}
          </span>
        </div>
      </div>

      {/* ── Personal Info ─────────────────────────────────────────────────── */}
      <Section icon={<User size={18} />} title={t('profile.personalInfo')}>
        <form
          onSubmit={profileForm.handleSubmit(d => profileMutation.mutate(d))}
          className="space-y-4"
        >
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              {t('users.form.fullName')} <span className="text-danger">*</span>
            </label>
            <input
              {...profileForm.register('name')}
              className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
            />
            {profileForm.formState.errors.name && (
              <p className="text-danger text-xs mt-1">{profileForm.formState.errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              {t('auth.email')} <span className="text-text-muted font-normal">({t('common.optional')})</span>
            </label>
            <input
              {...profileForm.register('email')}
              type="email"
              className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
            />
            {profileForm.formState.errors.email && (
              <p className="text-danger text-xs mt-1">{profileForm.formState.errors.email.message}</p>
            )}
          </div>

          {profileMutation.isError && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-2.5">
              {(profileMutation.error as any)?.response?.data?.message ?? t('common.errorGeneric')}
            </p>
          )}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-primary text-bg-primary font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {profileMutation.isPending ? t('common.saving') : t('profile.saveProfile')}
            </button>
            <SavedBanner show={profileSaved} />
          </div>
        </form>
      </Section>

      {/* ── Security ──────────────────────────────────────────────────────── */}
      <Section icon={<Lock size={18} />} title={t('profile.security')}>
        {/* Change password */}
        <div>
          <p className="text-sm font-medium text-white mb-3">{t('profile.changePassword')}</p>
          <form
            onSubmit={passwordForm.handleSubmit(d => passwordMutation.mutate(d))}
            className="space-y-3"
          >
            <div className="relative">
              <input
                {...passwordForm.register('password')}
                type={showPw ? 'text' : 'password'}
                placeholder={t('profile.newPasswordPlaceholder')}
                className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 pe-10 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {passwordForm.formState.errors.password && (
              <p className="text-danger text-xs">{passwordForm.formState.errors.password.message}</p>
            )}

            <div className="relative">
              <input
                {...passwordForm.register('confirm')}
                type={showConfirm ? 'text' : 'password'}
                placeholder={t('profile.confirmPasswordPlaceholder')}
                className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 pe-10 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {passwordForm.formState.errors.confirm && (
              <p className="text-danger text-xs">{passwordForm.formState.errors.confirm.message}</p>
            )}

            {passwordMutation.isError && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-2.5">
                {(passwordMutation.error as any)?.response?.data?.message ?? 'Something went wrong'}
              </p>
            )}

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={passwordMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-bg-tertiary border border-border text-white font-semibold text-sm hover:border-primary/50 disabled:opacity-50 transition-colors"
              >
                {passwordMutation.isPending ? t('common.saving') : t('profile.updatePassword')}
              </button>
              <SavedBanner show={passwordSaved} />
            </div>
          </form>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Change PIN */}
        <div>
          <p className="text-sm font-medium text-white mb-1">{t('profile.changePin')}</p>
          <p className="text-xs text-text-secondary mb-3">{t('profile.pinDescription')}</p>
          <form
            onSubmit={pinForm.handleSubmit(d => pinMutation.mutate(d))}
            className="space-y-3"
          >
            <input
              {...pinForm.register('pin')}
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={t('profile.newPinPlaceholder')}
              className="w-full sm:w-48 bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary tracking-[0.5em]"
            />
            {pinForm.formState.errors.pin && (
              <p className="text-danger text-xs">{pinForm.formState.errors.pin.message}</p>
            )}

            {pinMutation.isError && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-2.5">
                {(pinMutation.error as any)?.response?.data?.message ?? 'Something went wrong'}
              </p>
            )}

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={pinMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-bg-tertiary border border-border text-white font-semibold text-sm hover:border-primary/50 disabled:opacity-50 transition-colors"
              >
                {pinMutation.isPending ? t('common.saving') : t('profile.updatePin')}
              </button>
              <SavedBanner show={pinSaved} />
            </div>
          </form>
        </div>
      </Section>

      {/* ── App Settings ──────────────────────────────────────────────────── */}
      <Section icon={<Globe size={18} />} title={t('profile.appSettings')}>
        <div>
          <p className="text-sm font-medium text-white mb-3">{t('profile.displayLanguage')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LANGUAGE_OPTIONS.map(lang => {
              const active = i18n.language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={clsx(
                    'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                    active
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-bg-tertiary border-border text-text-secondary hover:text-white hover:border-white/20',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{lang.dir === 'rtl' ? '🔤' : '🔡'}</span>
                    <div className="text-start">
                      <p className={clsx('font-semibold', active ? 'text-primary' : 'text-white')}>{lang.nativeLabel}</p>
                      <p className="text-xs text-text-secondary">{lang.label}</p>
                    </div>
                  </div>
                  {active && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <CheckCircle size={12} className="text-bg-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* App info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">{t('profile.version')}</span>
          <span className="text-white font-medium">1.0.0</span>
        </div>
      </Section>
    </div>
  );
}
