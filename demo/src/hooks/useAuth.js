import { isValidEmail } from "../utils/validators.js";
import { useNotification } from "./useNotification.js";

export function useAuth() {
  let isAuthenticated = false;
  const notifier = useNotification();

  return {
    authenticate(email, password) {
      if (!isValidEmail(email)) return false;
      isAuthenticated = password.length > 0;
      if (isAuthenticated) {
        notifier.notify("User authenticated", "success");
      }
      return isAuthenticated;
    },
    isAuthenticated() {
      return isAuthenticated;
    },
  };
}
