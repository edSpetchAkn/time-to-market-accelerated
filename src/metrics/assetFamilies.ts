/**
 * Metric: Asset families with transformations or product link rules
 *
 * Calculates the percentage of asset families that have at least one
 * transformation pipeline OR at least one product link rule configured.
 *
 * A family that has either of these is considered "configured" — meaning
 * media processing and/or SKU-linking is automated for that family.
 *
 * numerator   = asset families where hasTransformations OR hasProductLinkRules
 * denominator = total asset families in the catalog
 *
 * Returns null percentage when no asset families exist in the catalog.
 *
 * @apiDependency None — operates on pre-fetched asset family data from
 *               fetchAssetFamilyList.ts.
 */

import { CONFIG } from '../config';
import type { MetricContext, MetricResult, DebugEntry, MetricStatus } from '../types';

/** Derives traffic light status from a percentage and the assetFamilies thresholds. */
function getStatus(pct: number | null): MetricStatus {
  if (pct === null) return null;
  if (pct >= CONFIG.metrics.assetFamilies.thresholds.green) return 'green';
  if (pct >= CONFIG.metrics.assetFamilies.thresholds.red) return 'amber';
  return 'red';
}

/**
 * Calculates the percentage of asset families with transformations or product link rules.
 *
 * @param context - Shared metric context containing assetFamilies and config.
 * @returns       MetricResult with key = 'assetFamilies'.
 */
export function calculate(context: MetricContext): MetricResult {
  const { assetFamilies, assetFamiliesFetchDebug, config } = context;
  const debugInfo: DebugEntry[] = [];

  // Prepend fetch trace so it's visible at the top of the debug panel.
  for (const line of assetFamiliesFetchDebug) {
    debugInfo.push({ step: 'FETCH', message: line });
  }

  const denominator = assetFamilies.length;

  if (denominator === 0) {
    const caveat =
      'No asset families found in this PIM instance. Asset Manager may not be in use.';
    debugInfo.push({ step: 'GUARD', message: caveat });

    return {
      key: CONFIG.metrics.assetFamilies.key,
      numerator: 0,
      denominator: 0,
      percentage: null,
      status: null,
      label: CONFIG.metrics.assetFamilies.label,
      caveat,
      debugInfo,
    };
  }

  debugInfo.push({
    step: 'DISCOVER',
    message: `Found ${denominator} asset famil${denominator !== 1 ? 'ies' : 'y'}`,
    count: denominator,
  });

  if (config.debugMode) {
    console.debug(`[ASSET_FAMILIES] ${debugInfo[debugInfo.length - 1].message}`);
  }

  // Count families that pass (either transformations OR product link rules).
  let withTransformations = 0;
  let withProductLinkRules = 0;
  let passingEither = 0;

  for (const family of assetFamilies) {
    if (family.hasTransformations) withTransformations++;
    if (family.hasProductLinkRules) withProductLinkRules++;
    if (family.hasTransformations || family.hasProductLinkRules) passingEither++;
  }

  const numerator = passingEither;
  const percentage = Math.round((numerator / denominator) * 1000) / 10;

  debugInfo.push({
    step: 'CALCULATE',
    message: `${numerator}/${denominator} families have transformations or product link rules`,
    count: numerator,
  });
  debugInfo.push({
    step: 'BREAKDOWN',
    message: `With transformations: ${withTransformations}, with product link rules: ${withProductLinkRules}`,
  });

  if (config.debugMode) {
    console.debug(`[ASSET_FAMILIES] ${debugInfo[debugInfo.length - 2].message}`);
    console.debug(`[ASSET_FAMILIES] ${debugInfo[debugInfo.length - 1].message}`);
    // Log per-family breakdown for the debug panel.
    const breakdown = assetFamilies.map((f) => ({
      code: f.code,
      hasTransformations: f.hasTransformations,
      hasProductLinkRules: f.hasProductLinkRules,
      passes: f.hasTransformations || f.hasProductLinkRules,
    }));
    console.table(breakdown);
  }

  return {
    key: CONFIG.metrics.assetFamilies.key,
    numerator,
    denominator,
    percentage,
    status: getStatus(percentage),
    label: CONFIG.metrics.assetFamilies.label,
    caveat: `${denominator} asset famil${denominator !== 1 ? 'ies' : 'y'} found. ${withTransformations} with transformations, ${withProductLinkRules} with product link rules.`,
    debugInfo,
  };
}
