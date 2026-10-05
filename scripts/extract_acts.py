#!/usr/bin/env python3
"""Izdvaja pojedinačne akte iz tekstova Službenog glasnika (pdftotext) i čisti ih za ingest.

Upotreba: python3 scripts/extract_acts.py <glasnik.pdf|txt> <broj_akta> <izlaz.txt>
Akt počinje redom "NNN." iza kojeg slijedi "Na osnovu ..." i traje do sljedećeg takvog reda.
"""
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


def pdf_columns(pdf: str) -> list[str]:
    """Glasnik je u dvije kolone; pdftotext ih miješa (naslovi člana odvoje se od teksta).
    Zato svaku stranicu čitamo kao lijevu pa desnu polovinu."""
    info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout
    pages = int(re.search(r'Pages:\s+(\d+)', info).group(1))
    w, h = (int(float(x)) for x in re.search(r'Page size:\s+([\d.]+) x ([\d.]+)', info).groups())
    out: list[str] = []
    for p in range(1, pages + 1):
        for x in (0, w // 2):
            r = subprocess.run(['pdftotext', '-f', str(p), '-l', str(p), '-x', str(x), '-y', '0',
                                '-W', str(w // 2), '-H', str(h), pdf, '-'], capture_output=True, text=True)
            out.extend(r.stdout.split('\n'))
    return out


def split_acts(lines: list[str]) -> dict[str, list[str]]:
    idx = [i for i, l in enumerate(lines)
           if START_RE.fullmatch(l) and i + 1 < len(lines) and INTRO_RE.match(lines[i + 1])]
    return {lines[a].strip().rstrip('.'): lines[a + 1:b] for a, b in zip(idx, idx[1:] + [len(lines)])}


def clean(lines: list[str]) -> str:
    kept = [l.rstrip() for l in lines if not NOISE_RE.match(l)]
    text = '\n'.join(kept)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return re.sub(r'(?m)^(\s*Član)\s+l\.', r'\1 1.', text)  # OCR: "Član l." -> "Član 1."


if __name__ == '__main__':
    src, num, dst = sys.argv[1:4]
    lines = pdf_columns(src) if src.endswith('.pdf') else open(src, encoding='utf-8', errors='ignore').read().split('\n')
    acts = split_acts(lines)
    if num not in acts:
        sys.exit(f'Akt {num} nije pronađen. Dostupni: {", ".join(acts)}')
    open(dst, 'w', encoding='utf-8').write(clean(acts[num]))
