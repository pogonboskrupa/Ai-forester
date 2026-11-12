/** "čl. 14a", "Član 14." ili "14 A" → broj člana koji postoji u propisu (npr. "14a"), inače null. */
export function findArticleNo(numbers: string[], input: string): string | null {
  const q = input
    .trim()
    .toLowerCase()
    .replace(/^(član|clan|čl|cl)\.?\s*/u, '')
    .replace(/[.\s]+$/g, '')
    .replace(/\s+/g, '')
    .trim();
  if (!q) return null;
  return numbers.find((n) => n.toLowerCase().replace(/\s+/g, '') === q) ?? null;
}
