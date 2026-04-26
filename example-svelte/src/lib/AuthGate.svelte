<script lang="ts">
  import { useConvexClient } from "convex-svelte";
  import { client as createBrowserAuth } from "@robelest/convex-auth/browser";
  import { api } from "../../convex/_generated/api";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();

  const convex = useConvexClient();
  const auth = createBrowserAuth({ convex, api: api.auth });

  let authState = $state(auth.state);
  let email = $state("");
  let password = $state("");
  let flow = $state<"signIn" | "signUp">("signIn");
  let error = $state<string | null>(null);
  let busy = $state(false);

  $effect(() => {
    return auth.onChange(() => {
      authState = auth.state;
    });
  });

  const isAuthenticated = $derived(authState?.userId != null);

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = null;
    busy = true;
    try {
      await auth.signIn("password", { email, password, flow });
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
    <form onsubmit={onSubmit} style="display: flex; flex-direction: column; gap: 12px;">
      <input
        type="email"
        placeholder="Email"
        bind:value={email}
        required
        style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border, #333);"
      />
      <input
        type="password"
        placeholder="Password"
        bind:value={password}
        required
        minlength={8}
        style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border, #333);"
      />
      {#if error}
        <p style="color: #ef4444; font-size: 13px;">{error}</p>
      {/if}
      <button
        type="submit"
        disabled={busy}
        style="padding: 10px 16px; border-radius: 6px; background: var(--accent, #fff); color: var(--bg, #000); font-weight: 600; cursor: {busy ? 'wait' : 'pointer'};"
      >
        {busy ? "..." : flow === "signIn" ? "Sign in" : "Create account"}
      </button>
    </form>
    <button
      type="button"
      onclick={() => (flow = flow === "signIn" ? "signUp" : "signIn")}
      style="margin-top: 12px; font-size: 13px; color: var(--muted); cursor: pointer; background: none; border: none;"
    >
      {flow === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}
    </button>
  </div>
{/if}
