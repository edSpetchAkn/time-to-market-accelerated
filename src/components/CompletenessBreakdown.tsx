/**
 * CompletenessBreakdown — renders per-channel completeness metric cards.
 *
 * Since completeness returns one result per channel, this component renders
 * one MetricCard per channel. Used by TimeToMarketApp (legacy) only.
 * TimeToMarketAcceleratedApp renders completeness cards directly.
 */

import type { CompletenessChannelResult } from '../types';
import { MetricCard } from './MetricCard';
import { CONFIG } from '../config';

interface CompletenessBreakdownProps {
  results: CompletenessChannelResult[];
}

/**
 * Renders one MetricCard per channel for the completeness metric.
 *
 * @param results - Array of per-channel completeness results.
 */
export function CompletenessBreakdown({ results }: CompletenessBreakdownProps): JSX.Element {
  if (results.length === 0) return <></>;

  return (
    <>
      {results.map((r) => (
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
    </>
  );
}
