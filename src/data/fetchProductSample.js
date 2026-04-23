import { fetchAllPages } from '../utils/paginate.js';
import { CONFIG } from '../config.js';

export async function fetchProductSample() {
  const maxPages = CONFIG.api.sampleMaxProducts / CONFIG.api.samplePageSize;
  return fetchAllPages(
    ({ page, limit }) => globalThis.PIM.api.product_uuid_v1.list({ page, limit, withCompletenesses: true }),
    CONFIG.api.samplePageSize,
    maxPages,
    'products',
    CONFIG.debugMode,
  );
}
