import {
  customQuery,
  customMutation,
  customAction,
} from "convex-helpers/server/customFunctions";
import { query, mutation, action } from "./_generated/server";
import { auth } from "./auth";

// Authenticated wrappers. Handlers receive ctx.auth with userId, user, etc.
// Throws NOT_SIGNED_IN if no valid session is present.
export const authQuery = customQuery(query, auth.ctx());
export const authMutation = customMutation(mutation, auth.ctx());
export const authAction = customAction(action, auth.ctx());
