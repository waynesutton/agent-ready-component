import {
  customQuery,
  customMutation,
  customAction,
} from "convex-helpers/server/customFunctions";
import { query, mutation, action } from "./_generated/server";
import { ConvexError } from "convex/values";
import { auth } from "./auth";

export const authQuery = customQuery(query, auth.ctx());
export const authMutation = customMutation(mutation, auth.ctx());
export const authAction = customAction(action, auth.ctx());

/**
 * Verify the caller's email is listed in the ADMIN_EMAILS environment variable.
 * Call at the top of any handler that should be restricted to admins.
 */
export async function assertAdmin(ctx: {
  auth: { getUserIdentity: () => Promise<{ email?: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) {
    throw new ConvexError("NOT_AUTHORIZED");
  }
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) {
    throw new ConvexError(
      "ADMIN_EMAILS environment variable is not configured",
    );
  }
  const adminEmails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!adminEmails.includes(identity.email.toLowerCase())) {
    throw new ConvexError("NOT_AUTHORIZED");
  }
}
