import { effect, signal } from '@preact/signals';

export type Provider = 'gemini' | 'openai' | 'claude' | 'proxy';
export type Mode = 'ai' | 'search';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  provider: Provider;
  geminiKey: string;
  geminiModel: string;
  openaiKey: string;
  openaiModel: string;
  claudeKey: string;
  claudeModel: string;
  proxyUrl: string;
  accessCode: string;
  theme: Theme;
  /** Ako odabrani AI ne odgovori (kvota, preopterećenje), probaj ostale s unesenim ključem. */
  fallback: boolean;
  mode: Mode;
}

export const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'] as const;
export const OPENAI_MODELS = ['gpt-5-mini', 'gpt-5', 'gpt-4.1-mini'] as const;
export const CLAUDE_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5'] as const;

const STORE_KEY = 'ai-sumar-settings';

const DEFAULTS: Settings = {
  provider: 'gemini',
  geminiKey: '',
  geminiModel: GEMINI_MODELS[0],
  openaiKey: '',
  openaiModel: OPENAI_MODELS[0],
  claudeKey: '',
  claudeModel: CLAUDE_MODELS[0],
  proxyUrl: (import.meta.env.VITE_PROXY_URL as string | undefined) ?? '',
  accessCode: '',
  theme: 'system',
  fallback: true,
  mode: 'ai',
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

export const PROVIDER_NAMES: Record<Provider, string> = {
  gemini: 'Gemini',
  openai: 'ChatGPT',
  claude: 'Claude',
  proxy: 'Proxy',
};

export function hasKey(p: Provider, s: Settings = settings.value): boolean {
  if (p === 'gemini') return !!s.geminiKey;
  if (p === 'openai') return !!s.openaiKey;
  if (p === 'claude') return !!s.claudeKey;
  return !!s.proxyUrl;
}

export const configuredProviders = (s: Settings = settings.value): Provider[] =>
  (['claude', 'openai', 'gemini', 'proxy'] as Provider[]).filter((p) => hasKey(p, s));

export const isConfigured = (s: Settings = settings.value): boolean => configuredProviders(s).length > 0;

export function modelOf(p: Provider, s: Settings = settings.value): string {
  if (p === 'gemini') return s.geminiModel;
  if (p === 'openai') return s.openaiModel;
  if (p === 'claude') return s.claudeModel;
  return 'proxy';
}

export function providerLabel(s: Settings = settings.value): string {
  if (s.mode === 'search') return 'Bez AI (pretraga)';
  const p = hasKey(s.provider, s) ? s.provider : configuredProviders(s)[0];
  return p ? `${PROVIDER_NAMES[p]} · ${modelOf(p, s)}` : 'AI nije povezan';
}

// Tema: atribut na <html>, CSS tokeni reaguju na njega.
effect(() => {
  const t = settings.value.theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
});
