export function formatDate(date) {
  return date.toISOString().split("T")[0];
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}
