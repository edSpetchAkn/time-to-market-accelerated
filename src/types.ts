/**
 * Shared type definitions for the Time to Market Accelerated dashboard.
 *
 * Single source of truth for data shapes flowing through the metric pipeline.
 * Import from here — do not redeclare these types elsewhere.
 */

import type { CONFIG } from './config';

// ─── Metric result shapes ─────────────────────────────────────────────────────

/** A single structured debug log entry produced during metric calculation. */
export interface DebugEntry {
  /** Short identifier for the calculation step (e.g. "DISCOVER", "CALCULATE"). */
  step: string;
  /** Human-readable description of what happened at this step. */
  message: string;
  /** Optional numeric count associated with the entry. */
  count?: number;
}

/**
 * Traffic light status derived by comparing a percentage against thresholds.
 * null when the metric cannot be calculated (percentage is null).
 */
export type MetricStatus = 'red' | 'amber' | 'green' | null;

/**
 * Standard result shape returned by every metric module's `calculate()`.
 *
 * When `percentage` is null, the metric could not be calculated — the
 * `caveat` field will always be non-null in that case to explain why.
 */
export interface MetricResult {
  /** Matches CONFIG.metrics[x].key — used to look up narratives and thresholds. */
  key: string;
  /** Numerator of the metric (e.g. products at 100%). */
  numerator: number;
  /** Total evaluated (e.g. products in sample). */
  denominator: number;
  /**
   * Calculated percentage (0–100), rounded to one decimal place.
   * Null when the metric cannot be calculated (e.g. empty sample, missing data).
   */
  percentage: number | null;
  /**
   * Traffic light status derived from CONFIG thresholds.
   * Null when percentage is null.
   */
  status: MetricStatus;
  /** Short display label for the metric. */
  label: string;
  /**
   * Human-readable explanation of why percentage is null, or a sampling note.
   * Always non-null when percentage is null.
   */
  caveat: string | null;
  /** Structured debug log entries populated during calculation. */
  debugInfo: DebugEntry[];
}

/**
 * Per-channel result for the completeness metric.
 * The completeness metric returns one of these per channel discovered in the data.
 */
export interface CompletenessChannelResult {
  /** The Akeneo channel code (e.g. "ecommerce", "print"). */
  channelCode: string;
  /** Number of products with 100% completeness on this channel. */
  numerator: number;
  /** Total products in the sample. */
  denominator: number;
  /**
   * Percentage of products at 100% completeness on this channel.
   * Null if no completeness data was found for this channel.
   */
  percentage: number | null;
  /** Traffic light status derived from CONFIG thresholds. */
  status: MetricStatus;
  /** Explanation when percentage is null. */
  caveat: string | null;
  /** Structured debug log entries. */
  debugInfo: DebugEntry[];
}

// ─── Domain types ─────────────────────────────────────────────────────────────

/**
 * An asset family with transformation/product-link-rule metadata resolved.
 * Built by fetchAssetFamilyList from PIM.api.asset_family_v1.list().
 */
export interface AkeneoAssetFamily {
  /** Asset family code. */
  code: string;
  /** True if the family has at least one transformation pipeline. */
  hasTransformations: boolean;
  /** True if the family has at least one product link rule. */
  hasProductLinkRules: boolean;
}

// ─── Metric context ───────────────────────────────────────────────────────────

/**
 * Shared context passed to every metric `calculate()` function.
 *
 * All data is pre-fetched by the dashboard and passed in — metric modules
 * make no API calls of their own.
 */
export interface MetricContext {
  /** Sampled products (up to sampleMaxProducts). */
  products: Product[];
  /** Asset families with transformation/product-link-rule booleans. */
  assetFamilies: AkeneoAssetFamily[];
  /** Fetch trace from fetchAssetFamilyList — shown in DebugPanel. */
  assetFamiliesFetchDebug: string[];
  /** The CONFIG object. */
  config: typeof CONFIG;
}
