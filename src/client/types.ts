// Public types exported alongside the class client and registerRoutes.

export type AgentReadyFileType = "llms.txt" | "agents.md" | "llms-full.txt";

export type RouteName =
  | "llms.txt"
  | "agents.md"
  | "llms-full.txt"
  | "llms-analytics"
  | "llms-status";

export type WidgetPosition =
  | "footer"
  | "floating-bottom-right"
  | "floating-bottom-left";

export type WidgetTheme = "light" | "dark" | "system";

export type ContentStatus = "draft" | "published" | "archived";

export type AiProvider = "claude" | "openai";

export type AgentReadySettings = {
  appName: string;
  appUrl: string;
  description: string;
  agentInstructions?: string;
  contactEmail?: string;
  widgetPosition: WidgetPosition;
  theme: WidgetTheme;
  testMode: boolean;
  cronEnabled: boolean;
  cronIntervalHours: number;
  analyticsEnabled: boolean;
  analyticsRequestRetentionDays: number;
  analyticsThreshold?: number;
  aiDescriptionsEnabled: boolean;
  aiProvider?: AiProvider;
  fullTxtEnabled: boolean;
  permissiveMode: boolean;
  versioningEnabled: boolean;
};

export type AgentReadyPage = {
  title: string;
  path: string;
  description: string;
  fullContent?: string;
  status: ContentStatus;
  isOptional?: boolean;
  order?: number;
  descriptionGeneratedByAi?: boolean;
};

export type AgentReadyEndpoint = {
  method: string;
  path: string;
  description: string;
  group?: string;
  status: ContentStatus;
  descriptionGeneratedByAi?: boolean;
};

export type AgentReadyStatus = {
  testMode: boolean;
  appName: string | null;
  appUrl: string | null;
  lastGeneratedAt: number | null;
  generatedFromVersion: string | null;
  generationInProgress: boolean;
  hasDrafts: boolean;
  fullTxtEnabled: boolean;
};

// A workpool job id returned by invalidateCache / regenerateAll.
// Kept as a branded string for type safety across the public surface.
export type CacheJobId = string & { readonly __brand: unique symbol };

// Per-route handler signature used inside `registerRoutes({ routes })`.
// Return `null` to let the component's default handler run. Return a `Response` to override.
export type RouteHandler = (
  ctx: unknown,
  req: Request,
) => Promise<Response | null>;

// Catch-all `onEvent` signature. Fires for every request to a registered route.
export type OnEventHandler = (
  ctx: unknown,
  req: Request,
  route: RouteName,
) => Promise<void>;

export type RegisterRoutesOptions = {
  llmsTxtPath?: string;
  agentsMdPath?: string;
  fullTxtPath?: string;
  analyticsPath?: string;
  statusPath?: string;
  routes?: Partial<Record<RouteName, RouteHandler>>;
  onEvent?: OnEventHandler;
  // Stripe-style event callbacks. Function refs that are persisted on upsertSettings.
  onGenerationComplete?: unknown;
  onAnalyticsThreshold?: unknown;
};
