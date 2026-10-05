import { effect, signal } from '@preact/signals';

export type Provider = 'gemini' | 'claude' | 'proxy';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  provider: Provider;
  geminiKey: string;
  geminiModel: string;
  claudeKey: string;
  claudeModel: string;
  proxyUrl: string;
  accessCode: string;
  theme: Theme;
}

export const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'] as const;
export const CLAUDE_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5'] as const;

const STORE_KEY = 'ai-sumar-settings';

const DEFAULTS: Settings = {
  provider: 'gemini',
  geminiKey: '',
  geminiModel: GEMINI_MODELS[0],
  claudeKey: '',
  claudeModel: CLAUDE_MODELS[0],
  proxyUrl: (import.meta.env.VITE_PROXY_URL as string | undefined) ?? '',
  accessCode: '',
  theme: 'system',
};

/** Ključevi iz prve verzije (pojedinačni localStorage unosi) prelaze u jedan objekt. */
function migrateLegacy(): Partial<Settings> {
  const get = (k: string) => localStorage.getItem(k) ?? '';
  const legacy: Partial<Settings> = {};
  if (get('geminiKey')) legacy.geminiKey = get('geminiKey');
  if (get('geminiModel')) legacy.geminiModel = get('geminiModel');
  if (get('proxyUrl')) Object.assign(legacy, { proxyUrl: get('proxyUrl'), provider: 'proxy' });
  if (get('accessCode')) legacy.accessCode = get('accessCode');
  return legacy;
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return { ...DEFAULTS, ...(raw ? (JSON.parse(raw) as Partial<Settings>) : migrateLegacy()) };
  } catch {
    return DEFAULTS;
  }
}

export const settings = signal<Settings>(load());

export function updateSettings(patch: Partial<Settings>): void {
  settings.value = { ...settings.value, ...patch };
}

effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(settings.value));
  } catch {
    /* privatni mod: postavke vrijede do zatvaranja taba */
  }
});

export const isConfigured = (s: Settings = settings.value): boolean =>
  (s.provider === 'gemini' && !!s.geminiKey) ||
  (s.provider === 'claude' && !!s.claudeKey) ||
  (s.provider === 'proxy' && !!s.proxyUrl);

export function providerLabel(s: Settings = settings.value): string {
  if (s.provider === 'gemini') return s.geminiModel;
  if (s.provider === 'claude') return s.claudeModel;
  return 'Proxy';
}

// Tema: atribut na <html>, CSS tokeni reaguju na njega.
effect(() => {
  const t = settings.value.theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
});
