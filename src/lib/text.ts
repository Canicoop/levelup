// Name helpers shared by every module: cleaning what the user typed, counting
// characters as the database does, and the key that decides when two names are
// the same.

// Trims the ends and turns any run of whitespace into one space, so
// "Supino  inclinado" and "Supino inclinado" are the same name.
export function cleanName(raw: string) {
  return raw.trim().replace(/\s+/g, ' ')
}

// Counts characters the way Postgres char_length does (code points), so an
// emoji counts as one character, not as two UTF-16 units.
export function characterCount(text: string) {
  return Array.from(text).length
}

// The key that decides when two names are "the same name", and what a search
// matches: cleaned, lower case and without accents. NFD splits "ç" into
// "c" plus a combining mark, and the marks are removed, so "Supino",
// "SUPINO" and "Supinó" share a key and "elevacao" finds "Elevação lateral".
// The database is stricter (lower(name): accents count) and stays as the
// safety net; the app refuses names that differ only in accents before they
// get there.
export function searchKey(text: string) {
  return cleanName(text).toLocaleLowerCase('pt-PT').normalize('NFD').replace(/\p{Diacritic}/gu, '')
}
