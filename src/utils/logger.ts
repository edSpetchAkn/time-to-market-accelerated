/**
 * Debug logging utility.
 *
 * All functions are gated by CONFIG.debugMode, except debugError which always
 * logs (errors must always be visible regardless of debug setting).
 */

import { CONFIG } from '../config';

/**
 * Logs a labelled group with structured data to the console.
 * No-op when CONFIG.debugMode is false.
 *
 * @param group - Label shown as the console group header.
 * @param data  - Value passed to console.table (objects/arrays) or console.log.
 */
export function debugLog(group: string, data: unknown): void {
  if (!CONFIG.debugMode) return;
  console.group(group);
  if (data !== null && typeof data === 'object') {
    console.table(data);
  } else {
    console.log(data);
  }
  console.groupEnd();
}

/**
 * Logs an error with a labelled group. Always active — not gated by debugMode.
 *
 * @param group - Label shown as the console group header.
 * @param error - The error to log.
 */
export function debugError(group: string, error: unknown): void {
  console.group(`[ERROR] ${group}`);
  console.error(error);
  console.groupEnd();
}

/**
 * Starts a named console timer. No-op when CONFIG.debugMode is false.
 *
 * @param label - Timer label (must match the label passed to debugTimeEnd).
 */
export function debugTime(label: string): void {
  if (!CONFIG.debugMode) return;
  console.time(label);
}

/**
 * Stops a named console timer and logs elapsed time. No-op when CONFIG.debugMode is false.
 *
 * @param label - Timer label (must match the label passed to debugTime).
 */
export function debugTimeEnd(label: string): void {
  if (!CONFIG.debugMode) return;
  console.timeEnd(label);
}
