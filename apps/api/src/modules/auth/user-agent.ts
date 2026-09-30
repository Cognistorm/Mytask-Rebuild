// Human-readable device/browser/OS for the session list (spec 01 AC-43). ua-parser-js 1.x (MIT).
import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  browser: string | null;
  os: string | null;
}

export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  if (!ua) return { browser: null, os: null };
  const r = new UAParser(ua).getResult();
  const browser = [r.browser.name, r.browser.major].filter(Boolean).join(' ') || null;
  const os = [r.os.name, r.os.version].filter(Boolean).join(' ') || null;
  return { browser, os };
}

export function describeDevice(ua: string | undefined, client: string): string | null {
  const { browser, os } = parseUserAgent(ua);
  if (client === 'ios' || client === 'android') return os ?? (client === 'ios' ? 'iOS' : 'Android');
  return [browser, os].filter(Boolean).join(' · ') || null;
}
