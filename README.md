# Product Time to Market Accelerated

An Akeneo PIM UI Extension that calculates and displays 3 maturity metrics for the
**"Time to Market Reduced"** business outcome. Deployed to the Activity Dashboard tab.

---

## Component Overview

**Position:** `pim.activity.navigation.tab` (Activity tab in the PIM shell)
**Type:** SDK-based iframe extension (React + TypeScript + Vite)
**Business Goal:** Reduce Costs
**Business Outcome:** Time to Market Reduced

The dashboard shows 3 maturity metrics with traffic-light indicators (RED / AMBER / GREEN)
and value narratives that communicate the impact of feature adoption on time to market.
Each card shows either a "Value at Risk" message (red/amber) or "Value Delivered" message (green).

All thresholds, labels, and narrative strings are defined in `src/config.ts` — no
instance-specific values are hardcoded anywhere in the source.

---

## Metrics Reference

### Metric 1: Completeness at 100% — by channel

**What it measures:** The percentage of sampled products that have 100% completeness
across every locale on each channel.

**Data source:** `PIM.api.product_uuid_v1.list({ withCompletenesses: true })`
→ `GET /api/rest/v1/products-uuid?withCompletenesses=true`

**Calculation logic:**
1. Fetch up to `CONFIG.api.sampleMaxProducts` products (default: 1,000), paginated at `CONFIG.api.samplePageSize` (default: 100)
2. For each product, read the `completenesses` array: `[{ scope, locale, data }]`
3. Discover all channel codes dynamically from the data — no codes are hardcoded
4. For each channel, a product passes if ALL locale entries for that channel have `data === 100`
5. Percentage = passing products / total sampled products × 100, rounded to 1 decimal place
6. One card is rendered per channel discovered in the sample

**Thresholds (from `CONFIG.metrics.completeness.thresholds`):**
| Band | Condition | Meaning |
|------|-----------|---------|
| RED | < 50% | Data quality gating is not working; manual checking burden is high |
| AMBER | 50%–89% | Progress but not yet acting as a reliable gatekeeper |
| GREEN | ≥ 90% | PIM is acting as a strict gatekeeper; launch confidence is high |

**Known limitations:**
- Sample-based, not exhaustive. Results are indicative for up to 1,000 products by API order.
- Products with no family assigned return no completeness data and are excluded from the count.
- Channel codes are discovered dynamically — if the sample doesn't cover all channels, some channels may be missing.

---

### Metric 2: Rules with Workflow-Based Execution

**What it measures (primary):** The percentage of rules in the Rules Engine that have
`execution_type === "workflow_based"` — meaning they trigger automatically based on
workflow status transitions.

**What it measures (fallback):** If the Rules API is unavailable (e.g. the PIM edition
doesn't include the Rules Engine), the metric falls back to showing the percentage of
active (enabled) workflows.

**Data source (primary):** `PIM.api.rule_definition_v1.list()`
→ `GET /api/rest/v1/rule-definitions`

**Data source (fallback):** `PIM.api.workflows_v1.list()`
→ `GET /api/rest/v1/workflows`

**Calculation logic (primary):**
1. Check if `PIM.api.rule_definition_v1` is available. If not, skip to fallback.
2. Fetch all rules (paginated, hard-stop at `CONFIG.api.maxRulesPages × 100`)
3. Filter locally: count rules where `execution_type === CONFIG.rules.workflowExecutionTypeValue`
4. Percentage = matching rules / total rules × 100

**Calculation logic (fallback):**
1. Fetch all workflows (paginated, hard-stop at `CONFIG.api.maxWorkflowPages × 100`)
2. Count workflows where `enabled === true`
3. Percentage = active workflows / total workflows × 100
4. Display label changes to `CONFIG.metrics.workflows.fallbackLabel`
5. A caveat is shown explaining that this is a proxy metric

**Thresholds (from `CONFIG.metrics.workflows.thresholds`):**
| Band | Condition | Meaning |
|------|-----------|---------|
| RED | < 50% | Automation is not integrated with workflows; manual handoffs dominate |
| AMBER | 50%–79% | Partial automation; some idle time remains |
| GREEN | ≥ 80% | Workflow-driven automation eliminates idle time between enrichment stages |

**Known limitations:**
- The exact string value for `execution_type` (`"workflow_based"`, `"workflow-based"`, etc.) is not confirmed in public API documentation. Check the debug panel on first deployment.
- Rules API may not be available on all PIM editions. The fallback provides a proxy metric.

---

### Metric 3: Asset Families with Transformations or Product Link Rules

**What it measures:** The percentage of asset families that have at least one
transformation pipeline OR at least one product link rule configured.

**Data source:** `PIM.api.asset_family_v1.list()`
→ `GET /api/rest/v1/asset-families`

**Calculation logic:**
1. Fetch all asset families (typically < 50; paginated, hard-stop at `CONFIG.api.maxAssetFamilyPages × 100`)
2. For each family, check `transformations` array (length > 0) and `product_link_rules` array (length > 0)
3. A family passes if `hasTransformations OR hasProductLinkRules`
4. Percentage = passing families / total families × 100

**Thresholds (from `CONFIG.metrics.assetFamilies.thresholds`):**
| Band | Condition | Meaning |
|------|-----------|---------|
| RED | < 50% | Most asset families have no automation; manual image prep is a launch bottleneck |
| AMBER | 50%–89% | Some families are configured; others still require manual processing |
| GREEN | ≥ 90% | Media automation is comprehensive; assets are ready as soon as they are uploaded |

**Known limitations:**
- If Asset Manager is not enabled on this PIM instance, no families will be found and the metric shows N/A.
- This checks whether configuration exists, not whether it is working correctly.

---

## Configuration Guide

All configuration lives in `src/config.ts`. The key sections:

### Changing thresholds

```typescript
metrics: {
  completeness: {
    thresholds: { red: 50, green: 90 },  // Change these numbers
    // ...
  },
}
```

The threshold logic is: `percentage < red → RED`, `red ≤ percentage < green → AMBER`, `percentage ≥ green → GREEN`.

### Changing value narratives

```typescript
metrics: {
  completeness: {
    valueAtRisk: "Your custom at-risk message here...",
    valueDelivered: "Your custom value-delivered message here...",
  },
}
```

### Changing sample size

```typescript
api: {
  sampleMaxProducts: 500,   // Reduce for faster loads; increase for more accuracy
  samplePageSize: 100,      // Akeneo API max is 100 — don't exceed this
},
```

### Changing the execution_type filter value

```typescript
rules: {
  workflowExecutionTypeValue: 'workflow_based',  // Change if the filter doesn't match
},
```

---

## Deployment Checklist

Follow these steps when deploying to a new client instance:

1. **Set `debugMode: false`** in `src/config.ts` before building for production.
   Or keep it as `import.meta.env.VITE_DEBUG_MODE === 'true'` and don't set that env var.

2. **Build the extension:**
   ```bash
   npm run build
   ```
   The output is `dist/time-to-market-poc.js`.

3. **Verify the client has the Rules Engine** (Growth/Enterprise):
   - If not, Metric 2 will automatically fall back to active workflow percentage.
   - The debug panel confirms which tier is active.

4. **Verify the client has Asset Manager** (Growth/Enterprise):
   - If not, Metric 3 will show N/A with an explanatory caveat.

5. **Verify the client has Workflows** (Growth/Enterprise):
   - Needed for both the primary Metric 2 (execution_type filter) and the fallback.

6. **Deploy with `debugMode: true` first:**
   - Check the debug panel in the Activity tab.
   - Confirm `rulesApiTier` shows `"rule_definition_v1"` or `"workflows_fallback"`.
   - Confirm the `execution_type distribution` shows the expected breakdown.
   - If all rules show `execution_type: "(undefined)"`, the field may not be populated on this version — contact Akeneo support.
   - If `workflowBasedRules` count is 0, verify `workflowExecutionTypeValue` in `CONFIG.rules`.

7. **Deploy to production** (`debugMode: false`):
   ```bash
   # Using the POST /{uuid} approach (see deployment notes in memory)
   curl -s -X DELETE "https://{instance}/api/rest/v1/ui-extensions/{uuid}" \
     -H "Authorization: Bearer {token}"
   curl -s -X POST "https://{instance}/api/rest/v1/ui-extensions" \
     -H "Authorization: Bearer {token}" \
     -F "name=time_to_market_poc" \
     -F "type=sdk_script" \
     -F "position=pim.activity.navigation.tab" \
     -F "file=@dist/time-to-market-poc.js;type=application/javascript" \
     -F "configuration[default_label]=Time to Market Accelerated" \
     -F "configuration[labels][en_US]=Time to Market Accelerated"
   ```

---

## Debug Mode

Enable via `.env` (for local development) or in `src/config.ts`:

```bash
# .env.development
VITE_DEBUG_MODE=true
```

When active, the dashboard shows:
- A "DEBUG" badge in the header
- Per-card "Show debug" toggle buttons with step-by-step calculation logs
- A "Debug Panel" at the bottom of the dashboard (click to expand) showing:
  - Rules API tier (primary vs fallback)
  - `execution_type` filter value used
  - `execution_type` distribution across all rules
  - Per-asset-family breakdown (hasTransformations, hasProductLinkRules)
  - Total load time in milliseconds

---

## Known Limitations

| Limitation | Mitigation |
|-----------|-----------|
| **Sample-based** — completeness checks up to 1,000 products, not the full catalog | Disclaimer shown in UI; sample size configurable in CONFIG |
| **Point-in-time snapshot** — not a trend | Re-load the page to refresh; no historical data |
| **execution_type value unconfirmed** | configurable in `CONFIG.rules.workflowExecutionTypeValue`; debug panel shows actual distribution |
| **Rules API may be inaccessible** | Automatic fallback to workflows_v1 with explanatory caveat |
| **Asset Manager may not be enabled** | Metric 3 shows N/A with explanatory caveat |
| **No product filtering** — samples first 1,000 by API order | For clients with very large catalogs, results may not be representative of all families |

---

## File Structure

```
time-to-market-poc/
├── src/
│   ├── config.ts                     # All configuration: thresholds, narratives, API settings
│   ├── types.ts                      # Shared TypeScript interfaces for metrics and context
│   ├── main.tsx                      # Entry point — mounts React root
│   ├── TimeToMarketAcceleratedApp.tsx # Root component — data fetching orchestration + layout
│   ├── utils/
│   │   ├── logger.ts                 # Debug logging utility (gated by CONFIG.debugMode)
│   │   └── paginate.ts               # Generic pagination helper for SDK APIs
│   ├── data/
│   │   ├── fetchProductSample.ts     # Fetches products with completeness data
│   │   ├── fetchRules.ts             # Fetches rules with execution_type preserved
│   │   ├── fetchWorkflows.ts         # Fetches workflows (fallback for rules metric)
│   │   └── fetchAssetFamilyList.ts   # Fetches asset families with transformation flags
│   ├── metrics/
│   │   ├── completeness.ts           # Metric 1: per-channel completeness calculation
│   │   ├── workflows.ts              # Metric 2: workflow-based rules (with fallback)
│   │   └── assetFamilies.ts          # Metric 3: families with transformations or link rules
│   ├── components/
│   │   ├── MetricCard.tsx            # Card with traffic light, percentage, value narrative
│   │   └── DebugPanel.tsx            # Collapsible dashboard-level debug information
│   └── types/
│       └── pim-sdk.d.ts              # Global SDK type declarations
├── extension_configuration.json      # Extension manifest (position, file, labels)
├── vite.config.ts                    # Build configuration (ESM, Terser, sourcemaps)
├── tsconfig.json                     # TypeScript compiler options
└── package.json                      # Dependencies and build scripts
```
