import { httpRouter } from "convex/server";
import { registerRoutes } from "@waynesutton/agent-ready";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { components, internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

// Wire auth callback and JWKS routes.
auth.http.add(http);

// Mount all agent-ready routes. onEvent logs every request for easy inspection.
registerRoutes(http, components.agentReady, {
  onEvent: async (_ctx, req, route) => {
    console.log(`[agent-ready] ${route} user-agent=${req.headers.get("user-agent") ?? "?"}`);
  },
  onGenerationComplete: internal.myApp.handleGenerationComplete,
  onAnalyticsThreshold: internal.myApp.handleAnalyticsThreshold,
});

// Serve the React app at the root with SPA fallback so deep links resolve to index.html.
registerStaticRoutes(http, components.selfHosting, {
  pathPrefix: "/",
  spaFallback: true,
});

export default http;
