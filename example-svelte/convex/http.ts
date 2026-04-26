import { httpRouter } from "convex/server";
import { registerRoutes } from "@waynesutton/agent-ready";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.http.add(http);

registerRoutes(http, components.agentReady, {
  onEvent: async (_ctx, _req, route) => {
    console.log(`[agent-ready] ${route}`);
  },
});

registerStaticRoutes(http, components.selfHosting, {
  pathPrefix: "/",
  spaFallback: true,
});

export default http;
