import { generateId } from "../utils/helpers.js";
import { formatDate } from "../utils/helpers.js";

const events = [];

export function trackEvent(name, payload = {}) {
  events.push({ id: generateId(), name, payload, timestamp: formatDate(new Date()) });
}

export function getEventsByName(name) {
  return events.filter((e) => e.name === name);
}

export function getEventCount() {
  return events.length;
}
