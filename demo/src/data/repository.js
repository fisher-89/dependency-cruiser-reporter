import { createApiClient } from "./apiClient.js";
import { cacheGet, cacheSet } from "./cache.js";

export function createRepository(entityName) {
  const client = createApiClient(`https://api.example.com/${entityName}`);
  return {
    findAll() {
      const cached = cacheGet(entityName);
      if (cached) return cached;
      const data = [];
      cacheSet(entityName, data);
      return data;
    },
    findById(id) {
      const cached = cacheGet(`${entityName}:${id}`);
      if (cached) return cached;
      const item = { id };
      cacheSet(`${entityName}:${id}`, item);
      return item;
    },
  };
}
