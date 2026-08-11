// Native <input type="number"> uses the page's `lang` attribute to decide which
// character counts as the decimal separator. This app renders <html lang="ar">,
// so Chromium-based browsers expect the Arabic decimal separator (٫) instead of
// ".": typing "12.3" silently drops everything from the "." onward, leaving "12".
// Numeric fields that need decimals (percentages, prices, areas) should use
// type="text" + inputMode="decimal" with this sanitizer instead, so "." always
// works regardless of locale.
export function sanitizeDecimalInput(raw: string): string {
  let value = raw.replace(/[^0-9.]/g, "");
  const firstDot = value.indexOf(".");
  if (firstDot !== -1) {
    value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, "");
  }
  return value;
}
