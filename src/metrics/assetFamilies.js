/**
 * assetFamilies.js
 *
 * A family passes if it has at least one transformation pipeline
 * or at least one product link rule configured.
 */

import { CONFIG } from '../config.js';

export function calculate(context) {
  const { assetFamilies, assetFamiliesFetchDebug } = context;
  const metricConfig = CONFIG.metrics.assetFamilies;

  if (!assetFamilies || assetFamilies.length === 0) {
    return {
      numerator: 0,
      denominator: 0,
      percentage: null,
      label: metricConfig.label,
      caveat: 'No asset families found in this PIM instance.',
      debugInfo: { fetchTrace: assetFamiliesFetchDebug ?? [], families: [] },
    };
  }

  const passing = assetFamilies.filter((f) => f.hasTransformations || f.hasProductLinkRules);
  const numerator = passing.length;
  const denominator = assetFamilies.length;
  const percentage = Math.round((numerator / denominator) * 1000) / 10;

  return {
    numerator,
    denominator,
    percentage,
    label: metricConfig.label,
    caveat: null,
    debugInfo: {
      fetchTrace: assetFamiliesFetchDebug ?? [],
      families: assetFamilies.map((f) => ({
        code: f.code,
        hasTransformations: f.hasTransformations,
        hasProductLinkRules: f.hasProductLinkRules,
        passes: f.hasTransformations || f.hasProductLinkRules,
      })),
    },
  };
}
