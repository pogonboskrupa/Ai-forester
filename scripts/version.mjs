#!/usr/bin/env node
/**
 * Verzije aplikacije: X.Y.Z, svaka brojka 0–9.
 * Z ide do 9, zatim Y+1 (Z=0); kad Y dođe do 9, X+1 (Y=0, Z=0). Npr. 1.0.9 -> 1.1.0, 1.9.9 -> 2.0.0.
 *
 *   node scripts/version.mjs            -> ispiše trenutnu verziju
 *   node scripts/version.mjs next       -> poveća verziju u package.json
 *   node scripts/version.mjs code       -> Android versionCode (X*100 + Y*10 + Z)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(file, 'utf8'));

export function parse(v) {
  const m = /^(\d)\.(\d)\.(\d)$/.exec(v);
  if (!m) throw new Error(`Neispravna verzija "${v}" (očekuje se X.Y.Z, svaka brojka 0–9)`);
  return m.slice(1).map(Number);
}

export function next(v) {
  let [x, y, z] = parse(v);
  if (z < 9) z++;
  else if (y < 9) [y, z] = [y + 1, 0];
  else [x, y, z] = [x + 1, 0, 0];
  return `${x}.${y}.${z}`;
}

export const versionCode = (v) => {
  const [x, y, z] = parse(v);
  return x * 100 + y * 10 + z;
};

const cmd = process.argv[2];
if (cmd === 'next') {
  const n = next(pkg.version);
  pkg.version = n;
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(n);
} else if (cmd === 'code') {
  console.log(versionCode(pkg.version));
} else if (import.meta.url === `file://${process.argv[1]}`) {
  parse(pkg.version);
  console.log(pkg.version);
}
