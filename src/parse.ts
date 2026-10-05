import type { Article, LawMeta } from './types';

const BREAK_BEFORE = /^(\(?\d{1,3}[.)]|\(\d{1,3}\)|[a-zčćšžđ]\)|[-–•*]\s|[IVX]+\.\s|"\(|„\()/;
const ENDS_BLOCK = /[.:;!?]["“”]?$/;

/** PDF lomi redove usred rečenice; spajamo ih, a čuvamo prelome za stavove, tačke i alineje. */
export function reflow(text: string): string {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const prev = out[out.length - 1];
    if (!line) {
      if (prev !== '') out.push('');
      continue;
    }
    if (prev === undefined || prev === '' || ENDS_BLOCK.test(prev) || BREAK_BEFORE.test(line)) {
      out.push(line);
    } else if (/[a-zčćšžđ]-$/i.test(prev) && /^[a-zčćšžđ]/.test(line)) {
      out[out.length - 1] = prev + line; // crtica ostaje: češće je složenica (Unsko-sanski) nego rastavljena riječ
    } else {
      out[out.length - 1] = `${prev} ${line}`;
    }
  }
  return out.join('\n').replace(/\n{2,}/g, '\n').trim();
}

const ARTICLE_RE = /^\s*(?:Član|Članak|Clan|Clanak|ČLAN|ČLANAK)\.?\s*(\d+[a-z]?)\.?\s*(?:\((.+?)\))?\s*$/;

/** Dijeli tekst zakona na članove; naslov člana je opcionalan red u zagradi ili prethodni red. */
export function parseArticles(raw: string, law: LawMeta): Article[] {
  const lines = raw.replace(/\r/g, '').split('\n');
  const out: Article[] = [];
  let cur: { number: string; heading: string; body: string[] } | null = null;
  let prevLine = '';
  const PAREN_RE = /^\([^()]{2,80}\)$/;

  const flush = () => {
    if (!cur) return;
    const text = reflow(cur.body.join('\n'));
    // Ponovljen broj člana (artefakt PDF-a, npr. kraj člana na sljedećoj stranici) spaja se s prvim.
    const dup = out.find((a) => a.number === cur!.number);
    if (dup) dup.text = `${dup.text}\n${text}`.trim();
    else if (text) {
      out.push({
        id: `${law.id}#${cur.number}`,
        lawId: law.id,
        lawTitle: law.title,
        level: law.level,
        gazette: law.gazette,
        number: cur.number,
        heading: cur.heading,
        text,
      });
    }
  };

  for (const line of lines) {
    const m = ARTICLE_RE.exec(line);
    if (m && m[1]) {
      flush();
      const heading = m[2] ?? (PAREN_RE.test(prevLine.trim()) ? prevLine.trim().slice(1, -1) : '');
      cur = { number: m[1], heading, body: [] };
    } else if (cur) {
      // naslov člana u zagradi odmah ispod "Član N." (format USK glasnika)
      if (!cur.heading && cur.body.every((l) => !l.trim()) && PAREN_RE.test(line.trim())) {
        cur.heading = line.trim().slice(1, -1);
      } else {
        cur.body.push(line);
      }
    }
    prevLine = line;
  }
  flush();
  return out.length ? out : chunkUnnumbered(raw, law);
}

const CHUNK = 1500;

/** Akti bez "Član N." (npr. naputci, odluke s numerisanim tačkama): dijelimo po paragrafima na ~1500 znakova. */
function chunkUnnumbered(raw: string, law: LawMeta): Article[] {
  const paras = raw.replace(/\r/g, '').split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const p of paras) {
    const last = chunks.length - 1;
    if (last >= 0 && (chunks[last] as string).length + p.length < CHUNK) chunks[last] += `\n${p}`;
    else chunks.push(p);
  }
  return chunks.map((text, i) => ({
    id: `${law.id}#${i + 1}`,
    lawId: law.id,
    lawTitle: law.title,
    level: law.level,
    gazette: law.gazette,
    number: `dio ${i + 1}`,
    heading: '',
    text,
  }));
}
