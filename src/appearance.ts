/** Čitljivost na terenu: veličina teksta i visok kontrast (jaka sunčeva svjetlost) kao atributi na <html>. */
export type TextSize = 'm' | 'l' | 'xl';

export const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: 'm', label: 'Normalna' },
  { id: 'l', label: 'Veća' },
  { id: 'xl', label: 'Najveća' },
];

export interface AppearanceInput {
  textSize: TextSize;
  contrast: boolean;
}

/** null znači "ukloni atribut" (zadano stanje); nepoznate vrijednosti iz starih postavki ostaju zadane. */
export function appearanceAttrs(a: AppearanceInput): { 'data-text': string | null; 'data-contrast': string | null } {
  return {
    'data-text': a.textSize === 'l' || a.textSize === 'xl' ? a.textSize : null,
    'data-contrast': a.contrast === true ? 'high' : null,
  };
}

export function applyAppearance(a: AppearanceInput, root: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(appearanceAttrs(a))) {
    if (v === null) root.removeAttribute(k);
    else root.setAttribute(k, v);
  }
}
