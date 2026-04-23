/**
 * MetricCard — renders a single metric result as a dashboard card.
 *
 * Displays the percentage as a large number, a traffic light indicator, and
 * a conditional value narrative (valueAtRisk for red/amber, valueDelivered
 * for green). All narrative strings come from CONFIG — nothing is hardcoded here.
 *
 * For per-channel completeness results the caller wraps CompletenessChannelResult
 * in this component's props shape before rendering.
 */

import React from 'react';
import { CONFIG } from '../config';
import type { MetricStatus } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Config entry for one metric — from CONFIG.metrics[key]. */
interface MetricConfigEntry {
  label: string;
  description: string;
  thresholds: { red: number; green: number };
  valueAtRisk: string;
  valueDelivered: string;
  fallbackLabel?: string;
}

export interface MetricCardProps {
  /** Metric key matching CONFIG.metrics keys. */
  metricKey: string;
  /** Display label (may be primary or fallback label). */
  label: string;
  numerator: number;
  denominator: number;
  percentage: number | null;
  status: MetricStatus;
  caveat: string | null;
  /** Channel code — only for completeness cards (renders as subtitle). */
  channelCode?: string;
  /** Full debugInfo for the collapsible debug section (shown only in debugMode). */
  debugInfo: Array<{ step: string; message: string; count?: number }>;
}

// ─── Traffic light colours ────────────────────────────────────────────────────

const STATUS_COLOURS: Record<NonNullable<MetricStatus>, string> = {
  red: '#D32F2F',
  amber: '#F9A825',
  green: '#388E3C',
};

const STATUS_BG: Record<NonNullable<MetricStatus>, string> = {
  red: '#FDECEA',
  amber: '#FFFDE7',
  green: '#E8F5E9',
};

const STATUS_BORDER: Record<NonNullable<MetricStatus>, string> = {
  red: '#FACACA',
  amber: '#FFF59D',
  green: '#C8E6C9',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e8e8e8',
  borderRadius: '8px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#5a5a5a',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  margin: 0,
  flex: 1,
};

const percentageStyle: React.CSSProperties = {
  fontSize: '36px',
  fontWeight: 700,
  color: '#11324D',
  margin: 0,
  lineHeight: 1,
};

const naStyle: React.CSSProperties = {
  ...percentageStyle,
  fontSize: '24px',
  color: '#aaaaaa',
};

const breakdownStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#888888',
  margin: 0,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#777777',
  margin: 0,
  lineHeight: '1.5',
  fontStyle: 'italic',
};

const narrativeHeaderStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: '0 0 4px 0',
};

const narrativeTextStyle: React.CSSProperties = {
  fontSize: '12px',
  margin: 0,
  lineHeight: '1.6',
};

const caveatStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#aaaaaa',
  margin: 0,
  lineHeight: '1.5',
};

const debugToggleStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#11324D',
  background: 'none',
  border: '1px solid #c7c7c7',
  borderRadius: '3px',
  padding: '2px 8px',
  cursor: 'pointer',
  alignSelf: 'flex-start',
};

const debugPanelStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e',
  borderRadius: '4px',
  padding: '10px 12px',
  fontSize: '11px',
  fontFamily: 'monospace',
  color: '#d4d4d4',
  overflowX: 'auto',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the metric config entry from CONFIG, or null if not found. */
function getMetricConfig(metricKey: string): MetricConfigEntry | null {
  const key = metricKey as keyof typeof CONFIG.metrics;
  return (CONFIG.metrics[key] as MetricConfigEntry) ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders a single metric as a dashboard card with:
 * - Traffic light indicator (coloured circle)
 * - Large percentage number + numerator/denominator
 * - Conditional value narrative (valueAtRisk / valueDelivered from CONFIG)
 * - Metric description as helper text
 * - Collapsible per-card debug log (debugMode only)
 */
export function MetricCard({
  metricKey,
  label,
  numerator,
  denominator,
  percentage,
  status,
  caveat,
  channelCode,
  debugInfo,
}: MetricCardProps): JSX.Element {
  const [showDebug, setShowDebug] = React.useState(false);
  const metricConfig = getMetricConfig(metricKey);

  const trafficLightColour = status ? STATUS_COLOURS[status] : '#cccccc';
  const narrativeBg = status ? STATUS_BG[status] : null;
  const narrativeBorder = status ? STATUS_BORDER[status] : null;
  const narrativeColour = status ? STATUS_COLOURS[status] : '#333333';

  return (
    <div style={cardStyle}>
      {/* Header: label + traffic light */}
      <div style={cardHeaderStyle}>
        <p style={labelStyle}>
          {label}
          {channelCode && (
            <span style={{ color: '#aaaaaa', fontWeight: 400 }}> — {channelCode}</span>
          )}
        </p>
        <div
          aria-label={`Status: ${status ?? 'unavailable'}`}
          title={status ?? 'unavailable'}
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: trafficLightColour,
            flexShrink: 0,
            marginTop: 2,
            border: '2px solid rgba(0,0,0,0.08)',
          }}
        />
      </div>

      {/* Percentage + breakdown */}
      {percentage !== null ? (
        <>
          <p style={percentageStyle}>{percentage.toFixed(1)}%</p>
          <p style={breakdownStyle}>
            {numerator.toLocaleString()} / {denominator.toLocaleString()}
          </p>
        </>
      ) : (
        <p style={naStyle}>N/A</p>
      )}

      {/* Value narrative — shown when status is known */}
      {status && metricConfig && (
        <div
          style={{
            backgroundColor: narrativeBg ?? 'transparent',
            border: `1px solid ${narrativeBorder ?? '#e8e8e8'}`,
            borderRadius: '4px',
            padding: '10px 12px',
          }}
        >
          <p style={{ ...narrativeHeaderStyle, color: narrativeColour }}>
            {status === 'green' ? 'Value Delivered' : 'Value at Risk'}
          </p>
          <p style={narrativeTextStyle}>
            {status === 'green' ? metricConfig.valueDelivered : metricConfig.valueAtRisk}
          </p>
        </div>
      )}

      {/* N/A caveat */}
      {percentage === null && caveat && <p style={caveatStyle}>{caveat}</p>}

      {/* Sampling/fallback caveat for calculable metrics */}
      {percentage !== null && caveat && <p style={caveatStyle}>{caveat}</p>}

      {/* Metric description */}
      {metricConfig && <p style={descriptionStyle}>{metricConfig.description}</p>}

      {/* Debug toggle (debugMode only) */}
      {CONFIG.debugMode && debugInfo.length > 0 && (
        <>
          <button style={debugToggleStyle} onClick={() => setShowDebug((v) => !v)}>
            {showDebug ? 'Hide debug' : 'Show debug'}
          </button>
          {showDebug && (
            <div style={debugPanelStyle}>
              {debugInfo.map((entry, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#569cd6' }}>[{entry.step}]</span>{' '}
                  {entry.message}
                  {entry.count !== undefined && (
                    <span style={{ color: '#b5cea8' }}> ({entry.count})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
