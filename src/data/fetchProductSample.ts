/**
 * Product sample fetcher.
 *
 * Fetches up to sampleMaxProducts products with completeness data.
 * No date filter is applied — the SDK's list method does not reliably support
 * the `search` query parameter, so we take the first N products in default
 * API order and cap via pagination.
 *
 * @param config - The CONFIG object from config.ts.
 * @returns      A flat array of sampled Products, each with `completenesses`.
 *
 * @apiDependency PIM.api.product_uuid_v1.list — withCompletenesses: true.
 */

import { fetchAllPages } from '../utils/paginate';
import type { AppConfig } from '../config';

/**
 * Fetches a sample of products with completeness data.
 *
 * Pagination hard-stops at `config.api.sampleMaxPages` pages.
 * No server-side filter is applied.
 *
 * @param config - The CONFIG object from config.ts.
 * @returns      Array of Products with `completenesses` populated.
 *
 * @apiDependency PIM.api.product_uuid_v1.list
 */
export async function fetchProductSample(config: AppConfig): Promise<Product[]> {
  if (config.debugMode) {
    console.debug(`[FETCH] fetchProductSample — sampling up to ${config.api.sampleMaxProducts} products`);
  }

  const products = await fetchAllPages<Product>(
    ({ page, limit }) =>
      PIM.api.product_uuid_v1.list({
        page,
        limit,
        withCompletenesses: true,
      }),
    config.api.samplePageSize,
    config.api.sampleMaxPages,
    'products',
    config.debugMode,
  );

  if (config.debugMode) {
    console.debug(`[FETCH] fetchProductSample — total fetched: ${products.length}`);
  }

  return products;
}
