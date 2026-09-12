// Helpers i18n no browser: lê window.__FLY_LOCALE__ e troca de idioma via cookie.
export function getLocale(fallback = "pt") {
  if (typeof window !== "undefined" && window.__FLY_LOCALE__)
    return window.__FLY_LOCALE__;
  return fallback;
}

export function setLocale(locale) {
  document.cookie = `fly_locale=${encodeURIComponent(locale)}; Path=/; SameSite=Lax; Max-Age=31536000`;
}

export function localizedHref(href, locale, defaultLocale) {
  if (!href.startsWith("/") || href.startsWith("/__fly")) return href;
  if (locale && locale !== defaultLocale)
    return `/${locale}${href === "/" ? "" : href}`;
  return href;
}
