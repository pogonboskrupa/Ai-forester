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
  sourceIds: string[];
  error?: boolean;
  ts: number;
}

export interface Conversation {
  id: string;
  projectId: string | null;
  title: string;
  messages: Msg[];
  updatedAt: number;
}
