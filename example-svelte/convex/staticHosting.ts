import { exposeUploadApi } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";

export const { generateUploadUrl, recordAsset, gcOldAssets, listAssets, getCurrentDeployment } =
  exposeUploadApi(components.staticHosting);
