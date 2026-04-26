import { createAuth } from "@robelest/convex-auth/component";
import { components } from "./_generated/api";
import { password } from "@robelest/convex-auth/providers/password";
import { anonymous } from "@robelest/convex-auth/providers/anonymous";

export const auth = createAuth(components.auth, {
  providers: [password(), anonymous()],
});

export const { signIn, signOut, store } = auth;
