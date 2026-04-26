import { exposeUploadApi } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";

// Re-export upload APIs so the CLI can call them during deploys.
export const {
  generateUploadUrl,
  generateUploadUrls,
  recordAsset,
  recordAssets,
  gcOldAssets,
  listAssets,
} = exposeUploadApi(components.selfHosting);
