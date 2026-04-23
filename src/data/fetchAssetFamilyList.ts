/**
 * Asset family list fetcher.
 *
 * Primary path: PIM.api.asset_family_v1.list() (SDK method).
 * Fallback path: direct fetch to /api/rest/v1/asset-families with credentials:include,
 * used when the SDK method returns 0 families but the REST endpoint has data.
 *
 * The raw Akeneo REST response uses { _embedded: { items: [...] }, _links: {...} }.
 * The SDK normalises to { items: [...], links: {...} } — but this normalisation
 * appears unreliable for asset families on some PIM versions, hence the fallback.
 *
 * Some SDK versions return a plain array for asset families rather than a paginated
 * list wrapper — extractItems handles all three response shapes.
 *
 * @apiDependency PIM.api.asset_family_v1.list — GET /api/rest/v1/asset-families
 */

import type { AppConfig } from '../config';
import type { AkeneoAssetFamily } from '../types';
import { getPimOrigin } from '../utils/paginate';

export interface AssetFamilyFetchResult {
  families: AkeneoAssetFamily[];
  fetchDebug: string[];
}

// ─── Response shape helpers ───────────────────────────────────────────────────

/**
 * Extract items from three possible response shapes:
 * 1. Plain array: AssetFamilyRecord[]                  (some SDK versions)
 * 2. SDK-normalised: { items: AssetFamilyRecord[] }
 * 3. Raw Akeneo REST: { _embedded: { items: [...] } }
 */
function extractItems(response: unknown): AssetFamilyRecord[] {
  // Shape 1: plain array
  if (Array.isArray(response)) return response as AssetFamilyRecord[];
  if (!response || typeof response !== 'object') return [];
  const r = response as Record<string, unknown>;
  // Shape 2: SDK-normalised { items: [...] }
  if (Array.isArray(r['items'])) return r['items'] as AssetFamilyRecord[];
  // Shape 3: raw REST { _embedded: { items: [...] } }
  const embedded = r['_embedded'];
  if (embedded && typeof embedded === 'object') {
    const e = embedded as Record<string, unknown>;
    if (Array.isArray(e['items'])) return e['items'] as AssetFamilyRecord[];
  }
  return [];
}

/** Check whether a next page exists in either response shape. */
function hasNextPage(response: unknown): boolean {
  if (Array.isArray(response)) return false;
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;
  const links = (r['links'] ?? r['_links']) as Record<string, unknown> | undefined;
  return !!(links?.['next']);
}

// ─── SDK path ─────────────────────────────────────────────────────────────────

async function fetchViaSdk(
  config: AppConfig,
  fetchDebug: string[],
): Promise<AssetFamilyRecord[]> {
  const api = PIM.api.asset_family_v1;
  if (!api) {
    fetchDebug.push('SDK: asset_family_v1 not available on this PIM object');
    return [];
  }

  const all: AssetFamilyRecord[] = [];

  for (let page = 1; page <= config.api.maxAssetFamilyPages; page++) {
    let response: unknown;
    try {
      response = await api.list({ page, limit: 100 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fetchDebug.push(`SDK: list() threw on page ${page}: ${msg}`);
      break;
    }

    // Capture response shape for debug panel.
    if (page === 1) {
      const shape = Array.isArray(response)
        ? `plain array, length=${(response as unknown[]).length}`
        : response && typeof response === 'object'
          ? `object, keys=[${Object.keys(response as object).join(', ')}]`
          : String(response);
      fetchDebug.push(`SDK: page 1 response shape: ${shape}`);
    }

    const items = extractItems(response);
    all.push(...items);
    fetchDebug.push(`SDK: page ${page} → ${items.length} items`);

    if (items.length === 0 || !hasNextPage(response)) break;
  }

  return all;
}

// ─── Direct fetch fallback ────────────────────────────────────────────────────

async function fetchViaRest(
  _config: AppConfig,
  fetchDebug: string[],
): Promise<AssetFamilyRecord[]> {
  fetchDebug.push('REST: SDK returned 0 — trying direct fetch fallback');

  const all: AssetFamilyRecord[] = [];

  // Use an absolute URL so this works regardless of the iframe's src origin.
  const origin = getPimOrigin();
  let url: string | null = `${origin}/api/rest/v1/asset-families?limit=100`;

  fetchDebug.push(`REST: base URL = ${url}`);

  while (url) {
    let response: Response;
    try {
      response = await fetch(url, { credentials: 'include' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fetchDebug.push(`REST: fetch threw: ${msg}`);
      break;
    }

    if (!response.ok) {
      fetchDebug.push(`REST: non-OK status ${response.status} ${response.statusText}`);
      break;
    }

    const json = await response.json() as unknown;

    // Capture response shape for debug panel.
    if (all.length === 0) {
      const shape = Array.isArray(json)
        ? `plain array, length=${(json as unknown[]).length}`
        : json && typeof json === 'object'
          ? `object, keys=[${Object.keys(json as object).join(', ')}]`
          : String(json);
      fetchDebug.push(`REST: page 1 response shape: ${shape}`);
    }

    const items = extractItems(json);
    all.push(...items);
    fetchDebug.push(`REST: ${items.length} items on this page, running total: ${all.length}`);

    // Follow _links.next for subsequent pages.
    const r = json as Record<string, unknown>;
    const links = (r['_links'] ?? r['links']) as Record<string, unknown> | undefined;
    const next = links?.['next'] as { href?: string } | undefined;
    url = next?.href ?? null;

    if (items.length === 0) break;
  }

  return all;
}

// ─── Public API ───────────────────────────────────────────────────────────────

function mapFamilies(families: AssetFamilyRecord[], config: AppConfig): AkeneoAssetFamily[] {
  return families.map((family) => {
    const hasTransformations = (family.transformations ?? []).length > 0;
    const hasProductLinkRules = (family.product_link_rules ?? []).length > 0;

    if (config.debugMode) {
      console.debug(
        `[FETCH] fetchAssetFamilyList — "${family.code}": transformations=${hasTransformations}, productLinkRules=${hasProductLinkRules}`,
      );
    }

    return { code: family.code, hasTransformations, hasProductLinkRules };
  });
}

/**
 * Fetches all asset families. Tries the SDK first; if it returns 0 families,
 * falls back to a direct authenticated REST call.
 *
 * Returns both the family list and a fetchDebug trace (surfaced in the DebugPanel).
 *
 * @param config - The CONFIG object from config.ts.
 * @returns      { families, fetchDebug }
 */
export async function fetchAssetFamilyList(config: AppConfig): Promise<AssetFamilyFetchResult> {
  const fetchDebug: string[] = [];

  if (config.debugMode) {
    console.debug('[FETCH] fetchAssetFamilyList — starting');
  }

  // Try SDK first.
  const sdkFamilies = await fetchViaSdk(config, fetchDebug);

  if (sdkFamilies.length > 0) {
    fetchDebug.push(`SDK: success — ${sdkFamilies.length} families total`);
    return { families: mapFamilies(sdkFamilies, config), fetchDebug };
  }

  // SDK returned 0 — fall back to direct REST call.
  const restFamilies = await fetchViaRest(config, fetchDebug);
  fetchDebug.push(`REST: final total — ${restFamilies.length} families`);

  return { families: mapFamilies(restFamilies, config), fetchDebug };
}
