import { isNotEmpty } from "../utils/validators.js";

export function useData(fetchFn) {
  let data = null;
  let loading = false;
  let error = null;

  return {
    async refresh() {
      loading = true;
      try {
        data = await fetchFn();
        error = null;
      } catch (e) {
        error = e.message;
      } finally {
        loading = false;
      }
    },
    getData() { return data; },
    isLoading() { return loading; },
    getError() { return error; },
  };
}
