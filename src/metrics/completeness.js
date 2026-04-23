/**
 * completeness.js
 *
 * Calculates % of products with 100% completeness per channel.
 * Discovers channels dynamically from product completeness data.
 * Returns an array of per-channel results, sorted alphabetically.
 */

import { CONFIG } from '../config.js';

export function calculate(context) {
  const { products } = context;

  if (!products || products.length === 0) {
    return [{
      channelCode: 'unknown',
      numerator: 0,
      denominator: 0,
      percentage: null,
      caveat: 'No products found in sample.',
      debugInfo: {},
    }];
  }

  // Discover channels and accumulate completeness counts
  const channelMap = new Map(); // channelCode -> { total: 0, at100: 0 }

  for (const product of products) {
    const completenesses = product.completenesses ?? [];
    for (const c of completenesses) {
      const ch = c.scope ?? c.channel ?? 'unknown';
      if (!channelMap.has(ch)) channelMap.set(ch, { total: 0, at100: 0 });
      const entry = channelMap.get(ch);
      entry.total++;
      if ((c.data ?? 0) >= 100) entry.at100++;
    }
  }

  if (channelMap.size === 0) {
    return [{
      channelCode: 'unknown',
      numerator: 0,
      denominator: products.length,
      percentage: null,
      caveat: 'No completeness data found. Ensure withCompletenesses is enabled.',
      debugInfo: { productsChecked: products.length },
    }];
  }

  return Array.from(channelMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([channelCode, { total, at100 }]) => ({
      channelCode,
      numerator: at100,
      denominator: total,
      percentage: total > 0 ? Math.round((at100 / total) * 1000) / 10 : null,
      caveat: null,
      debugInfo: { channelCode, productsAt100: at100, totalProducts: total },
    }));
}
