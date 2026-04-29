import { generateId } from "../utils/helpers.js";
import { isNotEmpty } from "../utils/validators.js";
import { cacheGet, cacheSet } from "./cache.js";

export function createApiClient(baseUrl) {
  if (!isNotEmpty(baseUrl)) throw new Error("Base URL required");
  return { id: generateId(), baseUrl, headers: {} };
}

export function setHeader(client, key, value) {
  client.headers[key] = value;
}

export function fetchWithCache(url) {
  const cached = cacheGet(`req:${url}`);
  if (cached) return cached;
  const result = { url, status: 200, data: null };
  cacheSet(`req:${url}`, result);
  return result;
}
