// One-time success messages carried to the next screen (the app version of the legacy redirect `with('success', …)`,
// e.g. the portfolio form → Selling → Portfolio). The receiving screen takes them once when it gets focus.
let pending: string[] = [];

export function setFlash(texts: string[]): void {
  pending = texts;
}

export function takeFlash(): string[] {
  const texts = pending;
  pending = [];
  return texts;
}
