/**
 * main.js — Time to Market Accelerated
 *
 * Entry point for the "Product Time to Market Accelerated" Custom Component.
 * Position: pim.activity.navigation.tab
 *
 * Orchestration:
 *   1. Wait for window.PIM (polling with exponential backoff)
 *   2. Fetch product sample + asset family list in parallel
 *   3. Calculate completeness (per channel) + asset families metrics
 *   4. Render the dashboard
 */

import { CONFIG } from './config.js';
import { debugLog, debugError, debugTime, debugTimeEnd } from './utils/logger.js';
import { fetchProductSample } from './data/fetchProductSample.js';
import { fetchAssetFamilyList } from './data/fetchAssetFamilyList.js';
import { calculate as calculateCompleteness } from './metrics/completeness.js';
import { calculate as calculateAssetFamilies } from './metrics/assetFamilies.js';
import { renderDashboard, renderLoading, renderError } from './renderer/dashboard.js';

// ── SDK Waiter ────────────────────────────────────────────────────────────────

function waitForPim(timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    if (window.PIM) {
      resolve(window.PIM);
      return;
    }

    const startTime = Date.now();
    let interval = 100;

    const poll = () => {
      if (window.PIM) {
        debugLog('main', `PIM SDK detected after ${Date.now() - startTime}ms`);
        resolve(window.PIM);
        return;
      }
      if (Date.now() - startTime >= timeoutMs) {
        reject(
          new Error(
            `PIM SDK (window.PIM) was not available after ${timeoutMs / 1000}s. ` +
            'Ensure this script is loaded within an Akeneo Custom Component context.'
          )
        );
        return;
      }
      interval = Math.min(interval * 1.5, 500);
      setTimeout(poll, interval);
    };

    setTimeout(poll, interval);
  });
}

// ── Main Orchestration ────────────────────────────────────────────────────────

async function run(container) {
  renderLoading(container);

  const timings = {};
  const t0 = Date.now();

  // ── Phase 1: Fetch product sample + asset families in parallel ──
  let products, assetFamilies, assetFamiliesFetchDebug;
  try {
    debugTime('fetchAll');
    const t1 = Date.now();
    const [fetchedProducts, familiesResult] = await Promise.all([
      fetchProductSample(),
      fetchAssetFamilyList(),
    ]);
    products = fetchedProducts;
    assetFamilies = familiesResult.families;
    assetFamiliesFetchDebug = familiesResult.fetchDebug;
    timings.fetch = Date.now() - t1;
    debugTimeEnd('fetchAll');
  } catch (err) {
    debugError('main.fetch', err);
    renderError(container, `Failed to load data from PIM: ${err.message}`);
    return;
  }

  debugLog('main', {
    productsFetched: products.length,
    assetFamiliesFetched: assetFamilies.length,
  });

  const context = { products, assetFamilies, config: CONFIG };

  // ── Phase 2: Calculate metrics ──
  const t2 = Date.now();

  let completenessResults, assetFamiliesResult;
  try {
    completenessResults = calculateCompleteness(context);
  } catch (err) {
    debugError('metric.completeness', err);
    completenessResults = [{
      channelCode: 'error',
      numerator: 0,
      denominator: 0,
      percentage: null,
      caveat: `Calculation error: ${err.message}`,
      debugInfo: { error: err.message },
    }];
  }

  try {
    assetFamiliesResult = calculateAssetFamilies(context);
  } catch (err) {
    debugError('metric.assetFamilies', err);
    assetFamiliesResult = {
      numerator: 0,
      denominator: 0,
      percentage: null,
      label: CONFIG.metrics.assetFamilies.label,
      caveat: `Calculation error: ${err.message}`,
      debugInfo: { error: err.message },
    };
  }

  timings.calculate = Date.now() - t2;

  // ── Phase 3: Render ──
  const t3 = Date.now();
  renderDashboard(container, {
    completenessResults,
    assetFamiliesResult,
    assetFamiliesFetchDebug,
    productCount: products.length,
    assetFamilyCount: assetFamilies.length,
    timings,
    config: CONFIG,
  });
  timings.render = Date.now() - t3;
  timings.total = Date.now() - t0;

  debugLog('main.timings', timings);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  if (!document.getElementById('root')) {
    document.body.innerHTML = '<div id="root"></div>';
  }
  const container = document.getElementById('root');

  try {
    await waitForPim();
    await run(container);
  } catch (err) {
    debugError('main.init', err);
    renderError(container, err.message);
  }
}

window.TimeToMarketAccelerated = { init };
init();
