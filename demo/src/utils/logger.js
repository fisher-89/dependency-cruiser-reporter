const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel = LOG_LEVELS.info;

export function setLevel(level) {
  currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
}

export function debug(msg) { if (currentLevel <= LOG_LEVELS.debug) console.log("[DEBUG]", msg); }
export function info(msg)  { if (currentLevel <= LOG_LEVELS.info)  console.log("[INFO]", msg); }
export function warn(msg)  { if (currentLevel <= LOG_LEVELS.warn)  console.log("[WARN]", msg); }
export function error(msg) { if (currentLevel <= LOG_LEVELS.error) console.log("[ERROR]", msg); }
