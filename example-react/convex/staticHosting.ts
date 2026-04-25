import { exposeUploadApi } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";

// Re-export upload APIs so the CLI can call them during `npm run deploy:static`.
export const { generateUploadUrl, recordAsset, gcOldAssets, listAssets, getCurrentDeployment } =
  exposeUploadApi(components.staticHosting);
