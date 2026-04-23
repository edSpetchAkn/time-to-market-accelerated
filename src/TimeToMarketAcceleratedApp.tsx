/**
 * TimeToMarketAcceleratedApp — root component for the "Product Time to Market
 * Accelerated" business outcome dashboard.
 *
 * Orchestrates data fetching and metric calculation for 2 maturity metrics:
 *   1. Completeness per channel at 100%
 *   2. Asset families with transformations or product link rules
 *
 * Data is fetched once on mount. All metric calculations are synchronous and
 * run on the pre-fetched data — no metric module makes API calls.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CONFIG } from './config';
import { fetchProductSample } from './data/fetchProductSample';
import { fetchAssetFamilyList } from './data/fetchAssetFamilyList';
import { MetricCard } from './components/MetricCard';
import { DebugPanel } from './components/DebugPanel';
import * as completeness from './metrics/completeness';
import * as assetFamilies from './metrics/assetFamilies';
import type {
  MetricContext,
  MetricResult,
  CompletenessChannelResult,
  AkeneoAssetFamily,
} from './types';

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '32px 24px',
  color: '#11324D',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '28px',
  paddingBottom: '20px',
  borderBottom: '1px solid #e8e8e8',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#11324D',
  margin: '0 0 6px 0',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#5a5a5a',
  margin: '0 0 10px 0',
  lineHeight: '1.5',
};

const tagRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const tagStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
  backgroundColor: '#EEF5FB',
  border: '1px solid #4CA8E0',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#11324D',
};

const debugBadgeStyle: React.CSSProperties = {
  marginLeft: '10px',
  padding: '1px 8px',
  backgroundColor: '#3A3A3A',
  color: '#f0f0f0',
  borderRadius: '10px',
  fontSize: '11px',
  fontFamily: 'monospace',
};

const sampleNoteStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#aaaaaa',
  margin: '0 0 24px 0',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '28px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#11324D',
  margin: '0 0 12px 0',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '16px',
};

const loadingStyle: React.CSSProperties = {
  padding: '40px 0',
  textAlign: 'center',
  color: '#5a5a5a',
  fontSize: '14px',
};

const errorStyle: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: '#FDECEA',
  border: '1px solid #FACACA',
  borderRadius: '4px',
  color: '#CB1119',
  fontSize: '13px',
};

const timestampStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#cccccc',
  marginTop: '16px',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardState {
  products: Product[];
  assetFamilies: AkeneoAssetFamily[];
  assetFamiliesFetchDebug: string[];
  loadTimeMs: number;
}

interface DashboardMetrics {
  completenessResults: CompletenessChannelResult[];
  assetFamiliesResult: MetricResult;
}

/**
 * Root component for the Time to Market Accelerated dashboard.
 */
export function TimeToMarketAcceleratedApp(): JSX.Element {
  const [data, setData] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  // Fetch all data sources on mount.
  useEffect(() => {
    let cancelled = false;
    const startTime = performance.now();

    async function load() {
      try {
        const [fetchedProducts, familiesResult] = await Promise.all([
          fetchProductSample(CONFIG),
          fetchAssetFamilyList(CONFIG),
        ]);

        if (cancelled) return;

        const loadTimeMs = Math.round(performance.now() - startTime);

        setData({
          products: fetchedProducts,
          assetFamilies: familiesResult.families,
          assetFamiliesFetchDebug: familiesResult.fetchDebug,
          loadTimeMs,
        });
        setFetchedAt(new Date());
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  // Calculate all metrics synchronously once data is available.
  const metrics = useMemo<DashboardMetrics | null>(() => {
    if (!data) return null;

    const context: MetricContext = {
      products: data.products,
      assetFamilies: data.assetFamilies,
      assetFamiliesFetchDebug: data.assetFamiliesFetchDebug,
      config: CONFIG,
    };

    try {
      return {
        completenessResults: completeness.calculate(context),
        assetFamiliesResult: assetFamilies.calculate(context),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Metric calculation failed: ${msg}`);
      return null;
    }
  }, [data]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>
          {CONFIG.businessContext.componentTitle}
          {CONFIG.debugMode && <span style={debugBadgeStyle}>DEBUG</span>}
        </h1>
        <p style={subtitleStyle}>
          PIM maturity metrics measuring how effectively your configuration drives speed to market.
        </p>
        <div style={tagRowStyle}>
          <span style={tagStyle}>Goal: {CONFIG.businessContext.goal}</span>
          <span style={tagStyle}>Outcome: {CONFIG.businessContext.outcome}</span>
        </div>
      </header>

      {/* Loading */}
      {isLoading && (
        <div style={loadingStyle} role="status" aria-live="polite">
          <p style={{ margin: '0 0 6px' }}>Loading catalog data…</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#aaaaaa' }}>
            Fetching products and asset families
          </p>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div style={errorStyle} role="alert">
          <strong>Failed to load data:</strong> {error}
        </div>
      )}

      {/* Dashboard */}
      {metrics && data && !isLoading && (
        <>
          <p style={sampleNoteStyle}>
            Based on a sample of up to {CONFIG.api.sampleMaxProducts.toLocaleString()} products.
            Results are indicative, not exhaustive.
          </p>

          {/* Metric 1 — Completeness per channel */}
          <section style={sectionStyle} aria-label="Completeness metrics">
            <h2 style={sectionTitleStyle}>Completeness at 100% — by channel</h2>
            <div style={gridStyle}>
              {metrics.completenessResults.map((r) => (
                <MetricCard
                  key={r.channelCode}
                  metricKey={CONFIG.metrics.completeness.key}
                  label={CONFIG.metrics.completeness.label}
                  channelCode={r.channelCode}
                  numerator={r.numerator}
                  denominator={r.denominator}
                  percentage={r.percentage}
                  status={r.status}
                  caveat={r.caveat}
                  debugInfo={r.debugInfo}
                />
              ))}
            </div>
          </section>

          {/* Metric 2 — Asset Families */}
          <section style={sectionStyle} aria-label="Asset management metrics">
            <h2 style={sectionTitleStyle}>Asset management</h2>
            <div style={gridStyle}>
              <MetricCard
                metricKey={CONFIG.metrics.assetFamilies.key}
                label={metrics.assetFamiliesResult.label}
                numerator={metrics.assetFamiliesResult.numerator}
                denominator={metrics.assetFamiliesResult.denominator}
                percentage={metrics.assetFamiliesResult.percentage}
                status={metrics.assetFamiliesResult.status}
                caveat={metrics.assetFamiliesResult.caveat}
                debugInfo={metrics.assetFamiliesResult.debugInfo}
              />
            </div>
          </section>

          {/* Timestamp */}
          {fetchedAt && (
            <p style={timestampStyle}>
              Last calculated: {fetchedAt.toLocaleTimeString()}
            </p>
          )}

          {/* Debug Panel */}
          <DebugPanel
            completenessResults={metrics.completenessResults}
            assetFamiliesResult={metrics.assetFamiliesResult}
            assetFamilies={data.assetFamilies}
            productCount={data.products.length}
            loadTimeMs={data.loadTimeMs}
          />
        </>
      )}
    </div>
  );
}
