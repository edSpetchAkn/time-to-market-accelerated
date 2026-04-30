/**
 * main.js — Time to Market Accelerated
 *
 * Entry point for the "Product Time to Market Accelerated" Custom Component.
 * Position: pim.activity.navigation.tab
 *
 * Orchestration:
 *   Phase 1 — fetch product families + asset families in parallel, render shell
 *   Phase 2 — fetch all products for the selected family, calculate metrics, render
 *             Re-runs on every family change.
 */

import { CONFIG } from './config.js';
import { debugLog, debugError, debugTime, debugTimeEnd } from './utils/logger.js';
import { fetchProductsByFamily } from './data/fetchProductSample.js';
import { fetchAssetFamilyList } from './data/fetchAssetFamilyList.js';
import { calculate as calculateCompleteness } from './metrics/completeness.js';
import { calculate as calculateAssetFamilies } from './metrics/assetFamilies.js';
import {
  renderLoading,
  renderError,
  renderShell,
  renderMetricsLoading,
  renderMetrics,
  renderMetricsError,
} from './renderer/dashboard.js';

// ── SDK Waiter ────────────────────────────────────────────────────────────────

function waitForPim(timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    if (window.PIM) { resolve(window.PIM); return; }

    const startTime = Date.now();
    let interval = 100;

    const poll = () => {
      if (window.PIM) {
        debugLog('main', `PIM SDK detected after ${Date.now() - startTime}ms`);
        resolve(window.PIM);
        return;
      }
      if (Date.now() - startTime >= timeoutMs) {
        reject(new Error(
          `PIM SDK (window.PIM) was not available after ${timeoutMs / 1000}s. ` +
          'Ensure this script is loaded within an Akeneo Custom Component context.'
        ));
        return;
      }
      interval = Math.min(interval * 1.5, 500);
      setTimeout(poll, interval);
    };

    setTimeout(poll, interval);
  });
}

// ── Schema Fetching ───────────────────────────────────────────────────────────

async function fetchAllFamilies() {
  debugTime('fetchFamilies');
  const all = [];
  let page = 1;

  while (true) {
    const response = await globalThis.PIM.api.family_v1.list({ page, limit: 100 });
    const items = response.items ?? [];
    all.push(...items);
    debugLog('fetchFamilies', `Page ${page}: ${items.length} families (total: ${all.length})`);
    if (items.length === 0 || !response.links?.next) break;
    page++;
  }

  debugTimeEnd('fetchFamilies');
  return all;
}

// ── Metric Visibility ─────────────────────────────────────────────────────────

function getEnabledMetrics(allKeys) {
  try {
    const vars = globalThis.PIM.custom_variables ?? {};
    const raw = Array.isArray(vars)
      ? vars.find(v => v.code === 'enabled_metrics')?.value
      : vars.enabled_metrics;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const requested = new Set(raw.split(',').map(k => k.trim()).filter(Boolean));
      const valid = allKeys.filter(k => requested.has(k));
      if (valid.length > 0) {
        debugLog('main.enabledMetrics', valid);
        return new Set(valid);
      }
    }
  } catch (_) {}
  return new Set(allKeys);
}

// ── Phase 2: Fetch products + calculate + render ──────────────────────────────

async function runMetrics(metricsArea, { families, assetFamilies, assetFamiliesFetchDebug, familyCode }) {
  renderMetricsLoading(metricsArea);

  const userLocale = globalThis.PIM.context?.user?.catalog_locale ?? 'en_US';
  const family = families.find(f => f.code === familyCode);
  const familyLabel = familyCode === '__none__'
    ? 'No family'
    : (family?.labels?.[userLocale] ?? family?.labels?.['en_US'] ?? familyCode);

  const timings = {};
  const t0 = Date.now();

  let products;
  try {
    const t1 = Date.now();
    debugTime('fetchProducts');
    products = await fetchProductsByFamily(familyCode);
    debugTimeEnd('fetchProducts');
    timings.fetch = Date.now() - t1;
  } catch (err) {
    debugError('runMetrics.fetch', err);
    renderMetricsError(metricsArea, err.message);
    return;
  }

  debugLog('runMetrics', { familyCode, productsFetched: products.length });

  const context = { products, assetFamilies, config: CONFIG };

  const enabledKeys = getEnabledMetrics(['completeness', 'assetFamilies']);

  const t2 = Date.now();

  let completenessResults;
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

  let assetFamiliesResult;
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

  const t3 = Date.now();
  renderMetrics(metricsArea, {
    completenessResults,
    assetFamiliesResult,
    assetFamiliesFetchDebug,
    productCount: products.length,
    familyLabel,
    assetFamilyCount: assetFamilies.length,
    showCompleteness:  enabledKeys.has('completeness'),
    showAssetFamilies: enabledKeys.has('assetFamilies'),
    timings,
    config: CONFIG,
  });
  timings.render = Date.now() - t3;
  timings.total  = Date.now() - t0;

  debugLog('runMetrics.timings', { familyCode, ...timings });
}

// ── Phase 1: Fetch schema + render shell ──────────────────────────────────────

async function run(container) {
  renderLoading(container);

  let families, assetFamilies, assetFamiliesFetchDebug;
  try {
    debugTime('fetchSchema');
    const [famResult, afResult] = await Promise.all([
      fetchAllFamilies(),
      fetchAssetFamilyList(),
    ]);
    families = famResult;
    assetFamilies = afResult.families;
    assetFamiliesFetchDebug = afResult.fetchDebug;
    debugTimeEnd('fetchSchema');
  } catch (err) {
    debugError('run.fetch', err);
    renderError(container, `Failed to load catalogue data: ${err.message}`);
    return;
  }

  debugLog('run', { familiesFetched: families.length, assetFamiliesFetched: assetFamilies.length });

  const userLocale = globalThis.PIM.context?.user?.catalog_locale ?? 'en_US';

  const { metricsArea, defaultFamilyCode } = renderShell(container, {
    families,
    userLocale,
    config: CONFIG,
    onFamilyChange: (familyCode) => {
      runMetrics(metricsArea, { families, assetFamilies, assetFamiliesFetchDebug, familyCode });
    },
  });

  await runMetrics(metricsArea, { families, assetFamilies, assetFamiliesFetchDebug, familyCode: defaultFamilyCode });
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
    const c = document.getElementById('root');
    if (c) renderError(c, err.message);
  }
}

window.TimeToMarketAccelerated = { init };
init();
