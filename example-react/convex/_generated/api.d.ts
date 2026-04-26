/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentReady_analytics from "../agentReady/analytics.js";
import type * as agentReady_content from "../agentReady/content.js";
import type * as auth from "../auth.js";
import type * as auth_core from "../auth/core.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as myApp from "../myApp.js";
import type * as staticHosting from "../staticHosting.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agentReady/analytics": typeof agentReady_analytics;
  "agentReady/content": typeof agentReady_content;
  auth: typeof auth;
  "auth/core": typeof auth_core;
  functions: typeof functions;
  http: typeof http;
  myApp: typeof myApp;
  staticHosting: typeof staticHosting;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  auth: import("@robelest/convex-auth/_generated/component.js").ComponentApi<"auth">;
  crons: import("@convex-dev/crons/_generated/component.js").ComponentApi<"crons">;
  workpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"workpool">;
  agentReady: import("@waynesutton/agent-ready/_generated/component.js").ComponentApi<"agentReady">;
  selfHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"selfHosting">;
};
