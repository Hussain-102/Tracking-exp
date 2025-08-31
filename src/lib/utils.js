// Normalize Arabic names (remove diacritics and case)
export function normalizeName(name) {
  return name.trim().toLowerCase().normalize('NFD').replace(/[\u064B-\u065F]/g, "");
}

// Verify user exists in the place
export function verifyUser(inputName, place) {
  const normalizedInput = normalizeName(inputName);
  return place.people.find(p => normalizeName(p.name) === normalizedInput) || null;
}

// Get current month in ISO format (YYYY-MM)
export function monthNowISO() {
  const now = new Date();
  return now.toISOString().slice(0, 7); // مثال: "2025-08"
}

// Sum array of expenses
export function sum(expenses) {
  return (expenses || []).reduce((a, b) => a + (b.amount || 0), 0);
}
