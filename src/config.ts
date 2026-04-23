/// <reference types="vite/client" />

/**
 * Instance-agnostic configuration for the "Product Time to Market Accelerated" dashboard.
 *
 * CONFIG is the single source of truth for:
 *   - API sampling limits
 *   - Metric definitions (labels, descriptions, thresholds, value narratives)
 *   - Business context displayed in the dashboard header
 *
 * CRITICAL RULES:
 *   - No attribute codes, channel codes, family codes, or instance-specific values
 *   - All threshold numbers live here — never inline in metric or renderer code
 *   - All narrative strings live here — never inline in component code
 *   - Set debugMode to false before any client-facing deployment
 */

export const CONFIG = {
  // ─────────────────────────────────────────────────────────────────────────
  // DEBUG — set to false before client handover
  // Enable via VITE_DEBUG_MODE=true in .env (or .env.development)
  // ─────────────────────────────────────────────────────────────────────────
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',

  // ─────────────────────────────────────────────────────────────────────────
  // API SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  api: {
    /** Hard ceiling on product sample size (pages × pageSize). */
    sampleMaxProducts: 1000,
    /** Products per API page. Akeneo REST API max = 100. */
    samplePageSize: Math.min(Number(import.meta.env.VITE_PRODUCTS_PAGE_SIZE) || 100, 100),
    /** Hard-stop page cap for products: ceil(sampleMaxProducts / samplePageSize). */
    get sampleMaxPages() { return Math.ceil(this.sampleMaxProducts / this.samplePageSize); },
    /** Hard-stop page cap for asset families (10 × 100 = 1,000 families max). */
    maxAssetFamilyPages: 10,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // METRIC DEFINITIONS
  // Each metric has: key, label, thresholds, description, valueAtRisk, valueDelivered
  // Thresholds:
  //   percentage < red threshold → RED
  //   percentage >= red threshold AND < green threshold → AMBER
  //   percentage >= green threshold → GREEN
  // ─────────────────────────────────────────────────────────────────────────
  metrics: {
    completeness: {
      key: 'completeness',
      label: '% of Products with 100% Completeness',
      description: 'What % of your products currently pass your completeness check for every locale on this channel?',
      thresholds: { red: 50, green: 90 },
      valueAtRisk:
        "The PIM isn't acting as a strict gatekeeper. Customer-facing product data quality is unknown — incomplete products can slip through to channels, creating a poor buyer experience and increasing the manual checking burden on your team.",
      valueDelivered:
        "Reaching the 'completeness' milestone faster means products transition to being ready to go live without manual checking, slashing days off the launch calendar. Your team can focus on enrichment, not chasing missing fields.",
    },
    assetFamilies: {
      key: 'assetFamilies',
      label: '% of Asset Families with Transformations or Product Link Rules',
      description:
        'How many of your asset families have at least one transformation pipeline or product link rule configured?',
      thresholds: { red: 50, green: 90 },
      valueAtRisk:
        "You risk products being content-ready, but blocked because images aren't yet cropped or resized for the channel. This manual image-prep bottleneck is a common cause of missed launch dates — someone has to manually process assets before products can go live.",
      valueDelivered:
        "By automating image cropping, resizing, and SKU-linking, you ensure that visual content is ready as soon as it is uploaded. This prevents scenarios where products are content-ready, but delayed because images aren't formatted for the web.",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BUSINESS CONTEXT (displayed in dashboard header)
  // ─────────────────────────────────────────────────────────────────────────
  businessContext: {
    goal: 'Reduce Costs',
    outcome: 'Time to Market Reduced',
    componentTitle: 'Product Time to Market Accelerated',
  },
} as const;

// Re-export a convenience type so other modules can reference CONFIG's shape.
export type AppConfig = typeof CONFIG;
