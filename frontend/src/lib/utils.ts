/**
 * Small shared helpers used across the frontend.
 * Plain dependency-light utilities (no react import) so they can be used
 * from anywhere without pulling in component concerns.
 */

/** Join a list of class names, dropping falsy entries. */
export function join(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Format a crore value as a readable string (e.g. 2840 -> "₹2,840 Cr"). */
export function formatCrore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const inLakh = Math.round(value * 100)
  return `₹${inLakh.toLocaleString('en-IN')} Cr`
}

/** Collapse a whitespace-heavy / hyphenated identifier into a slug. */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled'
}