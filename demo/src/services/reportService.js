import { formatDate } from "../utils/helpers.js";
import { fetchWithCache } from "../data/apiClient.js";

export function generateReport(type) {
  const data = fetchWithCache(`reports/${type}`);
  return { type, generatedAt: formatDate(new Date()), data: data.data || [] };
}

export function formatReport(report) {
  return `[${report.type}] ${report.generatedAt} - ${report.data.length} items`;
}
