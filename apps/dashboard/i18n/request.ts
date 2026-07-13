import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import type { Locale } from 'next-intl';

const locales = ['fr', 'en'] as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value as Locale | undefined;
  const locale = cookieLocale && locales.includes(cookieLocale as 'fr' | 'en')
    ? cookieLocale
    : 'fr';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
