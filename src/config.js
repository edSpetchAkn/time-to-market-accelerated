/**
 * config.js — Time to Market Accelerated
 *
 * Single source of truth for all configuration, thresholds, and narrative strings.
 * Set debugMode: false before client handover.
 */

export const CONFIG = {
  debugMode: false,

  api: {
    maxAssetFamilyPages: 10,
  },

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
      description: 'How many of your asset families have at least one transformation pipeline or product link rule configured?',
      thresholds: { red: 50, green: 90 },
      valueAtRisk:
        "You risk products being content-ready, but blocked because images aren't yet cropped or resized for the channel. This manual image-prep bottleneck is a common cause of missed launch dates — someone has to manually process assets before products can go live.",
      valueDelivered:
        "By automating image cropping, resizing, and SKU-linking, you ensure that visual content is ready as soon as it is uploaded. This prevents scenarios where products are content-ready, but delayed because images aren't formatted for the web.",
    },
  },

  businessContext: {
    goal: 'Reduce Costs',
    outcome: 'Time to Market Reduced',
    componentTitle: 'Product Time to Market Accelerated',
  },
};
