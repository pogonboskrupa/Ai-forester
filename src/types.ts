export type Level = 'BiH' | 'FBiH' | 'USK';

export interface LawMeta {
  id: string;
  file: string;
  title: string;
  level: Level;
  gazette: string;
  inForce: boolean;
  sourceUrl: string;
}

export interface Article {
  id: string; // `${lawId}#${number}`
  lawId: string;
  lawTitle: string;
  level: Level;
  gazette: string;
  number: string;
  heading: string;
  text: string;
}
