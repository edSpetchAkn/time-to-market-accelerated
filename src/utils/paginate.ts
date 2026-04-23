/**
 * Generic page-number-based pagination utility.
 *
 * Fetches items from an Akeneo REST API endpoint that uses page-number
 * pagination. Stops when:
 *   - The response has no `links.next` (last page), OR
 *   - The page returned 0 items (guard against empty last page), OR
 *   - `maxPages` has been reached (hard stop).
 *
 * @param lister    - A function that calls the SDK API with `{ page, limit }`.
 *                    Must be a closure with all non-pagination params already bound.
 * @param limit     - Items per page (max 100 for Akeneo APIs).
 * @param maxPages  - Hard-stop page cap. Fetching stops after this many pages
 *                    regardless of whether more data exists.
 * @param debugLabel - Human-readable label used in console.debug output.
 * @param debugMode  - When true, logs each page fetch to console.debug.
 * @returns          A flat array of all fetched items.
 */
/**
 * Returns the PIM origin URL suitable for building absolute fetch() URLs.
 *
 * In a sandboxed Akeneo extension iframe (no allow-same-origin), window.location.origin
 * is the string "null". In that case we fall back to document.referrer, which is the
 * URL of the parent PIM page and gives us the correct origin.
 */
export function getPimOrigin(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (origin && origin !== 'null') return origin;
  // ancestorOrigins: Chrome/Edge — contains parent origin even in sandboxed iframes
  // where window.location.origin is the string "null" and document.referrer is empty.
  const ao = (window.location as unknown as { ancestorOrigins?: DOMStringList }).ancestorOrigins;
  if (ao && ao.length > 0 && ao[0] && ao[0] !== 'null') return ao[0];
  // Firefox fallback — parse origin from the parent page referrer.
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      // ignore malformed referrer
    }
  }
  return '';
}

export async function fetchAllPages<T>(
  lister: (params: { page: number; limit: number }) => Promise<PaginatedList<T>>,
  limit: number,
  maxPages: number,
  debugLabel: string,
  debugMode: boolean,
): Promise<T[]> {
  const all: T[] = [];

  for (let page = 1; page <= maxPages; page++) {
    let response: PaginatedList<T>;

    try {
      response = await lister({ page, limit });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch ${debugLabel} (page ${page}): ${msg}`);
    }

    const items = response.items ?? [];
    all.push(...items);

    if (debugMode) {
      console.debug(
        `[PAGINATE] ${debugLabel} page ${page}/${maxPages} — ${items.length} items, running total: ${all.length}`,
      );
    }

    // Early exit: no more data or no next-page link.
    if (items.length === 0 || !response.links?.next) break;
  }

  return all;
}
