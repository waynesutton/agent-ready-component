import { registerRoutes, registerMarkdownRoutes } from "@waynesutton/agent-ready";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";
import { auth } from "./auth";

const http = auth.http();

registerRoutes(http, components.agentReady, {
  // Per-site markdown file, slug matches the appName in agent-ready.config.json.
  siteMdPath: "/agent-ready-sveltekit-demo.md",
  onEvent: async (_ctx, _req, route) => {
    console.log(`[agent-ready] ${route}`);
  },
});

registerMarkdownRoutes(http, components.agentReady, {});

registerStaticRoutes(http, components.selfHosting, {
  pathPrefix: "/",
  spaFallback: true,
});

export default http;
