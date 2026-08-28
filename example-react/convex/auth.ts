import { createAuth } from "@robelest/convex-auth/component";
import { github } from "@robelest/convex-auth/providers";
import { components } from "./_generated/api";

export const auth = createAuth(components.auth, {
  providers: [
    github({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],
});

export const { signIn, signOut, store } = auth;
