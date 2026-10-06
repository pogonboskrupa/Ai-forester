export type Level = 'BiH' | 'FBiH' | 'USK';

export interface LawMeta {
  id: string;
  file: string;
  title: string;
  level: Level;
  gazette: string;
  inForce: boolean;
  sourceUrl: string;
  topic?: string;
  amends?: string; // id osnovnog akta koji ovaj akt mijenja
}

export interface LawInfo extends LawMeta {
  articleCount: number;
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
  amendedBy?: string[]; // id-jevi članova iz zakona o izmjenama koji mijenjaju ovaj član
}

/** Projekt = tema s vlastitim skupom izvora (zakona) i uputama za AI. */
export interface Project {
  id: string;
  name: string;
  description: string;
  lawIds: string[]; // prazno = svi propisi
  instructions: string;
  createdAt: number;
}

export interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sourceIds: string[]; // redoslijed = brojevi citata [1], [2]...
  error?: boolean;
  stopped?: boolean;
  model?: string;
  /** faq = provjereni odgovor iz baze, search = odgovor iz pretrage bez AI-ja */
  kind?: 'ai' | 'faq' | 'search';
  ts: number;
}

export interface Conversation {
  id: string;
  projectId: string | null;
  title: string;
  messages: Msg[];
  updatedAt: number;
  pinned?: boolean;
}

/** Provjereni odgovor iz baze čestih pitanja (bez AI-ja). */
export interface FaqEntry {
  id: string;
  topic: string;
  q: string;
  alt: string[];
  answer: string; // markdown s [n] citatima
  sourceIds: string[];
  reviewed: boolean;
}
