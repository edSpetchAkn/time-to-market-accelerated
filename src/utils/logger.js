import { CONFIG } from '../config.js';

const PREFIX = '[TTM]';

export function debugLog(group, data) {
  if (!CONFIG.debugMode) return;
  console.group(`${PREFIX} ${group}`);
  if (data !== undefined) {
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      console.table(data);
    } else {
      console.log(data);
    }
  }
  console.groupEnd();
}

export function debugError(group, error) {
  console.group(`${PREFIX} ERROR — ${group}`);
  console.error(error);
  console.groupEnd();
}

export function debugTime(label) {
  if (!CONFIG.debugMode) return;
  console.time(`${PREFIX} ${label}`);
}

export function debugTimeEnd(label) {
  if (!CONFIG.debugMode) return;
  console.timeEnd(`${PREFIX} ${label}`);
}
