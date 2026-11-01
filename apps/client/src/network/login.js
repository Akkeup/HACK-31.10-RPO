// Usernames are case-insensitive in Discovery. Keeping the canonical form at
// the boundary makes old seed accounts and a PostgreSQL UNIQUE index agree.
export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}
