/**
 * Intercepts console.log/warn/error globally and stores entries in memory.
 * Call `installLogCapture()` once at app startup.
 * Use `getLogs()` / `clearLogs()` to access the buffer.
 */

const MAX_LOGS = 500;
const logs = [];

let installed = false;

export const installLogCapture = () => {
  if (installed) return;
  installed = true;

  const wrap = (level, original) => (...args) => {
    original(...args);
    const message = args
      .map((a) => {
        try {
          return typeof a === "object" ? JSON.stringify(a) : String(a);
        } catch {
          return "[unserializable]";
        }
      })
      .join(" ");
    logs.unshift({ level, message, time: new Date().toLocaleTimeString() });
    if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
  };

  console.log = wrap("log", console.log.bind(console));
  console.warn = wrap("warn", console.warn.bind(console));
  console.error = wrap("error", console.error.bind(console));
};

export const getLogs = () => [...logs];
export const clearLogs = () => { logs.length = 0; };
