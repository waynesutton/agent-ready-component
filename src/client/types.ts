// Public types exported alongside the class client and registerRoutes.

export type AgentReadyFileType =
  | "llms.txt"
  | "agents.md"
  | "llms-full.txt"
  | "robots.txt"
  | "sitemap.xml"
  | "agent-skills.json";

export type RouteName =
  | "llms.txt"
  | "agents.md"
  | "llms-full.txt"
  | "llms-analytics"
  | "llms-status"
  | "robots.txt"
  | "sitemap.xml"
  | "agent-skills"
  | "llms-readiness";

export type WidgetPosition =
  | "footer"
  | "floating-bottom-right"
  | "floating-bottom-left"
  | "floating-center";

export type WidgetTheme = "light" | "dark" | "system";

export type WidgetColors = {
  bg?: string;
  border?: string;
  textActive?: string;
  textInactive?: string;
  tabActiveBg?: string;
  accent?: string;
};

export type ContentStatus = "draft" | "published" | "archived";

export type AiProvider = "claude" | "openai";

export type ContentSignals = {
  aiTrain: boolean;
  search: boolean;
  aiInput: boolean;
};

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
  widgetVisible?: boolean;
  widgetStatusVisible?: boolean;
  widgetShowFiles?: boolean;
  widgetShowAppName?: boolean;
  widgetShowDescription?: boolean;
  widgetShowMeta?: boolean;
  widgetColors?: WidgetColors;
  contentSignals?: ContentSignals;
  markdownNegotiation?: boolean;
  discoveryHeaders?: boolean;
  robotsTxtEnabled?: boolean;
  robotsTxtAllowAiBots?: boolean;
  robotsTxtDisallowPaths?: string[];
  sitemapEnabled?: boolean;
  agentSkillsEnabled?: boolean;
  readinessEndpointEnabled?: boolean;
  widgetShowScoreTab?: boolean;
  widgetDesktopCollapse?: boolean;
  widgetCleanMode?: boolean;
  widgetShowHumanTab?: boolean;
  widgetShowMachineTab?: boolean;
  widgetShowChatLinks?: boolean;
  widgetShowChatGPT?: boolean;
  widgetShowClaude?: boolean;
  widgetShowPerplexity?: boolean;
};

export type AgentReadyPage = {
  title: string;
  path: string;
  description: string;
  fullContent?: string;
  status: ContentStatus;
  isOptional?: boolean;
  order?: number;
  /**
   * Optional grouping label rendered as an H2 in llms.txt. Use this to organize wikis,
   * docs sets, or marketing content into named sections. Pages without a section render
   * under the default "Pages" heading.
   */
  section?: string;
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
  widgetVisible: boolean;
  widgetStatusVisible: boolean;
  widgetShowFiles: boolean;
  widgetShowAppName: boolean;
  widgetShowDescription: boolean;
  widgetShowMeta: boolean;
  widgetShowScoreTab: boolean;
  widgetDesktopCollapse: boolean;
  widgetCleanMode: boolean;
  widgetShowHumanTab: boolean;
  widgetShowMachineTab: boolean;
  widgetShowChatLinks: boolean;
  widgetShowChatGPT: boolean;
  widgetShowClaude: boolean;
  widgetShowPerplexity: boolean;
  readinessEndpointEnabled: boolean;
  robotsTxtEnabled: boolean;
  sitemapEnabled: boolean;
  agentSkillsEnabled: boolean;
  discoveryHeaders: boolean;
  markdownNegotiation: boolean;
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

export type ReadinessCheck = {
  id: string;
  label: string;
  category: "discoverability" | "content" | "bots" | "protocol";
  status: "pass" | "fail" | "warn";
  detail?: string;
  points: number;
  maxPoints: number;
};

export type ReadinessReport = {
  score: number;
  checks: ReadonlyArray<ReadinessCheck>;
  generatedAt: number;
};

// Routes that registerRoutes() can skip when the host app already serves them.
// Includes core discovery files for apps that already publish their own llms.txt,
// agents.md, or llms-full.txt (for example via static hosting or a custom HTTP route).
export type SkippableRoute =
  | "/robots.txt"
  | "/sitemap.xml"
  | "/.well-known/agent-skills"
  | "/llms.txt"
  | "/agents.md"
  | "/llms-full.txt";

export type RegisterRoutesOptions = {
  llmsTxtPath?: string;
  agentsMdPath?: string;
  fullTxtPath?: string;
  analyticsPath?: string;
  statusPath?: string;
  robotsTxtPath?: string;
  sitemapPath?: string;
  agentSkillsPath?: string;
  readinessPath?: string;
  /** Routes to skip registration for. Use when the host app already defines these paths. */
  skipRoutes?: SkippableRoute[];
  routes?: Partial<Record<RouteName, RouteHandler>>;
  onEvent?: OnEventHandler;
  onGenerationComplete?: unknown;
  onAnalyticsThreshold?: unknown;
};
