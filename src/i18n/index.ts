import { createI18n } from 'vue-i18n'
import en from './en'
import zhTW from './zh-TW'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-TW': zhTW,
  },
})

export type SupportedLocale = 'en' | 'zh-TW'

export function setLocale(locale: SupportedLocale) {
  // @ts-expect-error vue-i18n typing
  i18n.global.locale.value = locale
}

export function getLocale(): SupportedLocale {
  // @ts-expect-error vue-i18n typing
  return i18n.global.locale.value as SupportedLocale
}
