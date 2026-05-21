import { dispatch } from "./actions.js";

const middlewares = [];

export function applyMiddleware(middleware) {
  middlewares.push(middleware);
}

export function enhancedDispatch(action, payload) {
  let result = { action, payload };
  for (const mw of middlewares) {
    result = mw(result) || result;
  }
  dispatch(result.action, result.payload);
}
