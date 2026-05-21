import { enhancedDispatch } from "./middleware.js";

export function dispatch(action, payload) {
  console.log("[dispatch]", action, payload);
}

export function setUserAction(user) {
  enhancedDispatch("SET_USER", user);
}

export function clearUserAction() {
  enhancedDispatch("CLEAR_USER", null);
}

export function setErrorAction(error) {
  enhancedDispatch("SET_ERROR", error);
}
