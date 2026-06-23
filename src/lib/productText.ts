// Helpers for rendering product copy that arrives as messy multi-line strings.
//
// Stripe stores a product's description as a plain string and ingredients in
// metadata, both with embedded newlines and "•" / "-" bullet markers. Rendered
// directly, the newlines collapse and everything runs together. These helpers
// parse that text into structured paragraphs / list items so it can render
// cleanly. They tolerate real newlines, literal "\n" sequences, and bullets
// that were packed onto a single line.

const LEADING_BULLET = /^\s*[-•·*]\s*/;
// Split on real newlines or an escaped "\n" sequence (some data is stored escaped).
const LINE_SPLIT = /\r?\n|\\n/;

export type Details = { paragraphs: string[]; bullets: string[] };

/** Parse a product description (+ optional features list) into paragraphs and bullets. */
export function parseDetails(description?: string | null, features?: string[]): Details {
  const paragraphs: string[] = [];
  const bullets: string[] = [];

  const handleSegment = (segment: string) => {
    const text = segment.trim();
    if (!text) return;
    // A single line may pack several "•" / "·" bullets together; split them out.
    const parts = text.split(/\s*[•·]\s+/).map((s) => s.trim()).filter(Boolean);
    const startsWithBullet = /^\s*[•·]/.test(text);
    if (parts.length > 1) {
      parts.forEach((part, i) => {
        if (i === 0 && !startsWithBullet) paragraphs.push(part);
        else bullets.push(part.replace(LEADING_BULLET, "").trim());
      });
    } else if (LEADING_BULLET.test(text)) {
      bullets.push(text.replace(LEADING_BULLET, "").trim());
    } else {
      paragraphs.push(text);
    }
  };

  if (description) description.split(LINE_SPLIT).forEach(handleSegment);
  if (features) {
    for (const f of features) {
      const t = f.replace(LEADING_BULLET, "").trim();
      if (t) bullets.push(t);
    }
  }
  return { paragraphs, bullets };
}

/** Parse an ingredient list (array or string) into clean, individual items. */
export function parseIngredients(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  const text = Array.isArray(raw) ? raw.join("\n") : raw;
  const byLine = text
    .split(LINE_SPLIT)
    .map((l) => l.replace(LEADING_BULLET, "").trim())
    .filter(Boolean);
  if (byLine.length > 1) return byLine;
  // Single blob: split on inline bullet or " - " separators.
  if (byLine.length === 1) {
    return byLine[0]
      .split(/\s*[•·]\s+|\s+-\s+/)
      .map((s) => s.replace(LEADING_BULLET, "").trim())
      .filter(Boolean);
  }
  return [];
}
