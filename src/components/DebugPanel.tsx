/**
 * DebugPanel — dashboard-level debug information panel.
 *
 * Renders a collapsible section (collapsed by default) showing raw API data,
 * metric debug logs, and timing information for all metrics.
 *
 * Only rendered when CONFIG.debugMode === true. Not shown in production builds
 * (Terser drops the dead code when debugMode compiles to false).
 */

import React from 'react';
import { CONFIG } from '../config';
import type { MetricResult, CompletenessChannelResult, AkeneoAssetFamily } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DebugPanelProps {
  completenessResults: CompletenessChannelResult[];
  assetFamiliesResult: MetricResult;
  /** Raw asset families data (before metric calculation). */
  assetFamilies: AkeneoAssetFamily[];
  /** Total products sampled. */
  productCount: number;
  /** Total load time in ms. */
  loadTimeMs: number | null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const panelWrapperStyle: React.CSSProperties = {
  marginTop: '32px',
  border: '1px solid #3A3A3A',
  borderRadius: '6px',
  overflow: 'hidden',
  fontFamily: 'monospace',
};

const panelHeaderStyle: React.CSSProperties = {
  backgroundColor: '#3A3A3A',
  color: '#f0f0f0',
  padding: '10px 16px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  userSelect: 'none',
};

const panelBodyStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e',
  color: '#d4d4d4',
  padding: '16px',
  fontSize: '11px',
  lineHeight: '1.6',
  overflowX: 'auto',
};

const sectionHeaderStyle: React.CSSProperties = {
  color: '#569cd6',
  fontWeight: 700,
  margin: '16px 0 6px',
  fontSize: '12px',
};

const keyStyle: React.CSSProperties = { color: '#9cdcfe' };
const valueStyle: React.CSSProperties = { color: '#ce9178' };
const numberStyle: React.CSSProperties = { color: '#b5cea8' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Kv({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div>
      <span style={keyStyle}>{label}:</span>{' '}
      <span>{value}</span>
    </div>
  );
}

function NumVal({ v }: { v: number | null }): JSX.Element {
  return v === null
    ? <span style={{ color: '#f44747' }}>null</span>
    : <span style={numberStyle}>{v}</span>;
}

function StrVal({ v }: { v: string | undefined | null }): JSX.Element {
  return <span style={valueStyle}>"{v ?? '(undefined)'}\"</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Collapsible debug panel shown at the bottom of the dashboard.
 * Only rendered when CONFIG.debugMode === true.
 */
export function DebugPanel({
  completenessResults,
  assetFamiliesResult,
  assetFamilies,
  productCount,
  loadTimeMs,
}: DebugPanelProps): JSX.Element | null {
  const [open, setOpen] = React.useState(false);

  if (!CONFIG.debugMode) return null;

  return (
    <div style={panelWrapperStyle} role="region" aria-label="Debug Panel">
      <div
        style={panelHeaderStyle}
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v); }}
      >
        <span>Debug Panel — Development Only</span>
        <span style={{ fontSize: '16px' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={panelBodyStyle}>
          {/* ── Overview ── */}
          <p style={{ ...sectionHeaderStyle, marginTop: 0 }}>OVERVIEW</p>
          <Kv label="debugMode" value={<span style={{ color: '#4ec9b0' }}>true</span>} />
          <Kv label="productsSampled" value={<NumVal v={productCount} />} />
          <Kv label="sampleMaxProducts" value={<NumVal v={CONFIG.api.sampleMaxProducts} />} />
          <Kv label="totalLoadTimeMs" value={<NumVal v={loadTimeMs} />} />

          {/* ── Completeness ── */}
          <p style={sectionHeaderStyle}>METRIC 1 — COMPLETENESS</p>
          {completenessResults.map((r) => (
            <div key={r.channelCode} style={{ marginBottom: 8 }}>
              <Kv label="channel" value={<StrVal v={r.channelCode} />} />
              <Kv label="percentage" value={<NumVal v={r.percentage} />} />
              <Kv label="status" value={<StrVal v={r.status} />} />
              <Kv label="numerator" value={<NumVal v={r.numerator} />} />
              <Kv label="denominator" value={<NumVal v={r.denominator} />} />
              {r.debugInfo.map((d, i) => (
                <div key={i} style={{ paddingLeft: 12, color: '#aaaaaa', fontSize: '10px' }}>
                  [{d.step}] {d.message}
                </div>
              ))}
            </div>
          ))}

          {/* ── Asset Families ── */}
          <p style={sectionHeaderStyle}>METRIC 2 — ASSET FAMILIES</p>
          <Kv label="percentage" value={<NumVal v={assetFamiliesResult.percentage} />} />
          <Kv label="status" value={<StrVal v={assetFamiliesResult.status} />} />
          <Kv label="numerator" value={<NumVal v={assetFamiliesResult.numerator} />} />
          <Kv label="denominator" value={<NumVal v={assetFamiliesResult.denominator} />} />
          <div style={{ marginTop: 4 }}>
            <span style={keyStyle}>familyBreakdown:</span>
            <pre style={{ margin: '2px 0 0 12px', color: '#d4d4d4', fontSize: '10px' }}>
              {JSON.stringify(
                assetFamilies.map((f) => ({
                  code: f.code,
                  hasTransformations: f.hasTransformations,
                  hasProductLinkRules: f.hasProductLinkRules,
                  passes: f.hasTransformations || f.hasProductLinkRules,
                })),
                null,
                2,
              )}
            </pre>
          </div>
          {assetFamiliesResult.debugInfo.map((d, i) => (
            <div key={i} style={{ paddingLeft: 12, color: '#aaaaaa', fontSize: '10px' }}>
              [{d.step}] {d.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
