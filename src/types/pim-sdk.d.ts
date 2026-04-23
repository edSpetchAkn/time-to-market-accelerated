/**
 * Akeneo Extension SDK — Global Ambient Type Declarations
 *
 * Trimmed to the types used by this extension. All declarations are globally
 * ambient — visible across the entire project without any import statement.
 *
 * The global `PIM` variable is injected at runtime by the Akeneo PIM sandbox.
 */

// ─── Shared ───────────────────────────────────────────────────────────────────

interface ApiLink { href: string }

interface ApiLinks {
  self?: ApiLink;
  first?: ApiLink;
  previous?: ApiLink;
  next?: ApiLink;
}

interface PaginatedList<T> {
  items: T[];
  count?: number;
  currentPage?: number;
  links?: ApiLinks;
}

// ─── Product ──────────────────────────────────────────────────────────────────

/**
 * Per-channel/locale completeness entry returned when withCompletenesses=true.
 * `scope` = channel code, `locale` = locale code, `data` = percentage 0–100.
 */
interface Completeness {
  locale?: string;
  scope?: string;
  data?: number;
}

interface Product {
  uuid: string;
  identifier?: string | null;
  enabled?: boolean;
  family?: string | null;
  categories?: string[];
  parent?: string | null;
  completenesses?: Completeness[];
  created?: string;
  updated?: string;
  links?: ApiLinks;
}

interface ProductListParams {
  page?: number;
  limit?: number;
  withCount?: boolean;
  withCompletenesses?: boolean;
}

interface SdkApiProductUuid {
  list: (params?: ProductListParams) => Promise<PaginatedList<Product>>;
}

// ─── Rule Definition ──────────────────────────────────────────────────────────

/**
 * A single rule definition from the Akeneo Rules Engine.
 * Returned by GET /api/rest/v1/rule-definitions.
 */
interface RuleDefinition {
  code: string;
  enabled: boolean;
  priority?: number;
  execution_type?: string;
}

interface RuleDefinitionListParams {
  page?: number;
  limit?: number;
}

interface SdkApiRuleDefinition {
  list: (params?: RuleDefinitionListParams) => Promise<PaginatedList<RuleDefinition>>;
}

// ─── Asset Family ─────────────────────────────────────────────────────────────

/**
 * An asset family record returned by GET /api/rest/v1/asset-families.
 * Includes `transformations` and `product_link_rules` arrays which indicate
 * whether the family has automation/media-handling configured.
 */
interface AssetFamilyRecord {
  code: string;
  labels?: { [locale: string]: string };
  /** Transformation pipelines configured on this family (e.g. thumbnail generation). */
  transformations?: unknown[];
  /** Product link rules that auto-link assets to products. */
  product_link_rules?: unknown[];
  links?: ApiLinks;
}

interface AssetFamilyListParams {
  page?: number;
  limit?: number;
}

interface SdkApiAssetFamily {
  list: (params?: AssetFamilyListParams) => Promise<PaginatedList<AssetFamilyRecord>>;
}

// ─── Workflows ────────────────────────────────────────────────────────────────

/**
 * A workflow record returned by GET /api/rest/v1/workflows.
 * Used as a fallback when rule_definition_v1 is not available.
 */
interface WorkflowRecord {
  uuid?: string;
  code?: string;
  labels?: Record<string, string>;
  enabled?: boolean;
  steps?: unknown[];
}

interface WorkflowListParams {
  page?: number;
  limit?: number;
}

interface SdkApiWorkflows {
  list: (params?: WorkflowListParams) => Promise<PaginatedList<WorkflowRecord>>;
}

// ─── Navigation & Context ─────────────────────────────────────────────────────

type PIM_USER = {
  username: string;
  uuid: string;
  first_name: string;
  last_name: string;
  groups: Array<{ id: number; name: string }>;
};

type BaseContext = {
  position: string;
  user: { catalog_locale: string; catalog_scope: string };
};

type PIM_CONTEXT = BaseContext & (
  | { product?: { uuid: string; identifier: string | null } }
  | { category?: { code: string } }
  | { productGrid?: { productUuids: string[]; productModelCodes: string[] } }
);

type EXTENSION_VARIABLES = Record<string | number, string | number | Array<string | number>>;

// ─── PIM SDK Root ─────────────────────────────────────────────────────────────

type PIM_SDK = {
  user: PIM_USER;
  context: PIM_CONTEXT;
  api: {
    product_uuid_v1: SdkApiProductUuid;
    /** Rules Engine API — Enterprise/Growth only. May be undefined on Community. */
    rule_definition_v1?: SdkApiRuleDefinition;
    asset_family_v1: SdkApiAssetFamily;
    /** Workflows API — available on Growth/Enterprise with Workflows feature. */
    workflows_v1?: SdkApiWorkflows;
    /** Additional namespaces available at runtime. */
    [key: string]: unknown;
  };
  navigate: {
    internal: (path: string) => void;
    external: (rawUrl: string) => void;
    refresh: () => void;
  };
  custom_variables: EXTENSION_VARIABLES;
};

// ─── Global ───────────────────────────────────────────────────────────────────

declare var PIM: PIM_SDK;
