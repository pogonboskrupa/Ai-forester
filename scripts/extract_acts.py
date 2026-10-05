#!/usr/bin/env python3
"""Izdvaja pojedinačne akte iz tekstova Službenog glasnika (pdftotext) i čisti ih za ingest.

EXTRACT_LAYOUT=single forsira jednokolonsko čitanje (npr. dokumenti s tabelama).
Upotreba: python3 scripts/extract_acts.py <glasnik.pdf|txt> <broj_akta> <izlaz.txt>
Akt počinje redom "NNN." iza kojeg slijedi "Na osnovu ..." i traje do sljedećeg takvog reda.
"""
import os
import re
import subprocess
import sys

NOISE = [
    r'SLUŽBENI GLASNIK', r'Unsko-sanskog kantona', r'UNSKO-SANSKOG KANTONA', r'BIHAĆ',
    r'Godina [IVXL]+ ?[-–] ?Broj \d+', r'Izdanje na bosanskom', r'jeziku',
    r'Broj \d+ ?[-–] ?Stran[ae] \d+', r'Stran[ae] \d+ ?[-–] ?Broj \d+',
    r'(Ponedjeljak|Utorak|Srijeda|Četvrtak|Petak|Subota|Nedjelja),? \d+\..*\d{4}\.?',
    r'\d{1,2}\. [a-zčćšžđ]+ \d{4}\.', r'Stranica \d+',
    r'SLUŽBENI GLAS', r'SLUŽBENI GLASNIK US KANTONA', r'NIK US KANTONA', r'US KANTONA', r'SLUŽBENI GLASNIK U',
]
NOISE_RE = re.compile(r'^\s*(?:' + '|'.join(NOISE) + r')\s*$')
START_RE = re.compile(r'\s*\d{2,4}\.\s*')
INTRO_RE = re.compile(r'\s*(Na osnovu|Na temelju|Temeljem|Član|Člana|Na prijedlog)')


def _crossing_ratios(pdf: str, pages: int, width: int) -> list[float]:
    """Udio riječi po stranici koje prelaze sredinu (žlijeb između kolona). Dvokolonske stranice ~0."""
    out = []
    for page in range(1, pages + 1):
        xml = subprocess.run(['pdftotext', '-bbox', '-f', str(page), '-l', str(page), pdf, '-'],
                             capture_output=True, text=True).stdout
        words = re.findall(r'xMin="([\d.]+)"[^>]*xMax="([\d.]+)"', xml)
        mid = width / 2
        out.append(sum(1 for lo, hi in words if float(lo) < mid - 4 and float(hi) > mid + 4) / len(words) if words else 1.0)
    return out


def pdf_columns(pdf: str) -> list[str]:
    """Dokument u dvije kolone (glasnici) čitamo kolonu po kolonu; jednokolonski dokument čitamo normalno.
    Odluka je na nivou dokumenta (medijan), jer centrirani naslovi članova varaju detekciju po stranici."""
    info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout
    pages = int(re.search(r'Pages:\s+(\d+)', info).group(1))
    w, h = (int(float(x)) for x in re.search(r'Page size:\s+([\d.]+) x ([\d.]+)', info).groups())
    ratios = _crossing_ratios(pdf, pages, w)
    single_doc = os.environ.get('EXTRACT_LAYOUT') == 'single' or sorted(ratios)[len(ratios) // 2] > 0.02
    out: list[str] = []
    for p, ratio in enumerate(ratios, start=1):
        if single_doc or ratio > 0.03:  # u dvokolonskom dokumentu stranice s naslovom preko cijele širine
            r = subprocess.run(['pdftotext', '-f', str(p), '-l', str(p), pdf, '-'], capture_output=True, text=True)
            out.extend(r.stdout.split('\n'))
            continue
        for x in (0, w // 2):
            r = subprocess.run(['pdftotext', '-f', str(p), '-l', str(p), '-x', str(x), '-y', '0',
                                '-W', str(w // 2), '-H', str(h), pdf, '-'], capture_output=True, text=True)
            out.extend(r.stdout.split('\n'))
    return out


LEGACY = str.maketrans({'~': 'č', '^': 'Č', '@': 'Ž', '`': 'ž', '[': 'Š', '{': 'š', '\\': 'Đ', '|': 'đ', ']': 'Ć', '}': 'ć'})


def fix_legacy_font(text: str) -> str:
    """Stari YU-fontovi (Sl. novine FBiH ~2003-2008) kodiraju č,ć,š,ž,đ kao ~ ^ { } | itd."""
    return text.translate(LEGACY) if re.search(r'[~^]lan|SLU@BENE|\^lanak', text) else text


def split_acts(lines: list[str]) -> dict[str, list[str]]:
    idx = [i for i, l in enumerate(lines)
           if START_RE.fullmatch(l) and i + 1 < len(lines) and INTRO_RE.match(lines[i + 1])]
    return {lines[a].strip().rstrip('.'): lines[a + 1:b] for a, b in zip(idx, idx[1:] + [len(lines)])}


def clean(lines: list[str]) -> str:
    kept = [l.rstrip() for l in lines if not NOISE_RE.match(l)]
    text = '\n'.join(kept)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = fix_legacy_font(text)
    return re.sub(r'(?m)^(\s*Član)\s+l\.', r'\1 1.', text)  # OCR: "Član l." -> "Član 1."


def extract_by_title(lines: list[str], title: str) -> list[str]:
    """Za izdanja bez numerisanih akata (Sl. novine FBiH, Sl. glasnik BiH): od naslova do potpisa ('s. r.')
    ispred sljedećeg 'Član 1.' (početak sljedećeg akta)."""
    start = next((i for i, l in enumerate(lines) if re.search(title, l)), None)
    if start is None:
        sys.exit(f'Naslov "{title}" nije pronađen.')
    first = next((i for i in range(start, len(lines)) if re.match(r'\s*Član 1\.\s*$', lines[i])), start)
    sig = next((i for i in range(first, len(lines))
                if re.search(r's\. ?r\.', lines[i]) and any('stupa na snagu' in x for x in lines[max(first, i - 25):i])),
               len(lines) - 2)
    return lines[start:sig + 2]


if __name__ == '__main__':
    src, num, dst = sys.argv[1:4]
    lines = pdf_columns(src) if src.endswith('.pdf') else open(src, encoding='utf-8', errors='ignore').read().split('\n')
    if num.startswith('title:'):
        open(dst, 'w', encoding='utf-8').write(clean(extract_by_title(lines, num[6:])))
        sys.exit(0)
    acts = split_acts(lines)
    if num not in acts:
        sys.exit(f'Akt {num} nije pronađen. Dostupni: {", ".join(acts)}')
    open(dst, 'w', encoding='utf-8').write(clean(acts[num]))
