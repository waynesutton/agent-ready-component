<script lang="ts">
  import { useConvexClient } from "convex-svelte";
  import { client as createBrowserAuth } from "@robelest/convex-auth/browser";
  import { api } from "../../convex/_generated/api";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();

  const convex = useConvexClient();
  const auth = createBrowserAuth({ convex, api: api.auth });

  let authState = $state(auth.state);
  let error = $state<string | null>(null);
  let busy = $state(false);

  $effect(() => {
    return auth.onChange(() => {
      authState = auth.state;
    });
  });

  const isAuthenticated = $derived(authState?.isAuthenticated === true);

  async function handleSignInWithGitHub() {
    error = null;
    busy = true;
    try {
      await auth.signIn("github");
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : "Sign in failed";
    } finally {
      busy = false;
    }
  }

  async function handleSignOut() {
    await auth.signOut();
  }
</script>

{#if isAuthenticated}
  <div>
    <div style="display: flex; justify-content: flex-end; padding: 8px 0; gap: 8px;">
      <span style="color: var(--muted); font-size: 13px;">Signed in</span>
      <button
        type="button"
        onclick={handleSignOut}
        style="font-size: 13px; cursor: pointer;"
      >
        Sign out
      </button>
    </div>
    {@render children()}
  </div>
{:else}
  <div style="max-width: 360px; margin: 80px auto; padding: 24px;">
    <h2 style="margin-bottom: 8px;">Admin access required</h2>
    <p style="color: var(--muted); margin-bottom: 24px; font-size: 14px;">
      Sign in to manage settings and analytics.
    </p>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      {#if error}
        <p style="color: #ef4444; font-size: 13px;">{error}</p>
      {/if}
      <button
        type="button"
        onclick={handleSignInWithGitHub}
        disabled={busy}
        style="padding: 10px 16px; border-radius: 6px; background: var(--accent, #fff); color: var(--bg, #000); font-weight: 600; cursor: {busy ? 'wait' : 'pointer'};"
      >
        {busy ? "Opening GitHub..." : "Sign in with GitHub"}
      </button>
    </div>
  </div>
{/if}
