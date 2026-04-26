import { useState, useCallback, useSyncExternalStore } from "react";
import { useConvex } from "convex/react";
import { client as createBrowserAuth } from "@robelest/convex-auth/browser";
import { api } from "../convex/_generated/api";
import type { BrowserAuthClient } from "@robelest/convex-auth/browser";

let authClient: BrowserAuthClient | null = null;

function getAuth(convex: ReturnType<typeof useConvex>): BrowserAuthClient {
  if (!authClient) {
    authClient = createBrowserAuth({ convex, api: api.auth });
  }
  return authClient;
}

export function useAuth() {
  const convex = useConvex();
  const auth = getAuth(convex);

  const state = useSyncExternalStore(
    (cb) => auth.onChange(cb),
    () => auth.state,
  );

  const signIn = useCallback(
    async (provider: string, params?: Record<string, string>) => {
      return auth.signIn(provider, params);
    },
    [auth],
  );

  const signOut = useCallback(async () => {
    return auth.signOut();
  }, [auth]);

  return { state, signIn, signOut, isAuthenticated: state?.userId != null };
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { state, signIn, signOut, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 0", gap: 8 }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            Signed in
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            style={{ fontSize: 13, cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
        {children}
      </div>
    );
  }

  const onSignInWithGitHub = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn("github");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h2 style={{ marginBottom: 8 }}>Admin access required</h2>
      <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>
        Sign in to manage settings and analytics.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
        <button
          type="button"
          onClick={onSignInWithGitHub}
          disabled={busy}
          style={{
            padding: "10px 16px",
            borderRadius: 6,
            background: "var(--accent, #fff)",
            color: "var(--bg, #000)",
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Opening GitHub..." : "Sign in with GitHub"}
        </button>
      </div>
    </div>
  );
}
