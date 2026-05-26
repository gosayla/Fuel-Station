import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getDirection, type SupportedLanguage } from '@fuel-station/shared';

export function LanguageWrapper({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const lang = i18n.language as SupportedLanguage;
  const dir = getDirection(lang);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  return <>{children}</>;
}
