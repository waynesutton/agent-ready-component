<script lang="ts">
  const links = [
    { href: "/docs", label: "Agent Ready docs", description: "In-demo README-style install guide" },
    { href: "https://diffs.com/docs", label: "Diffs by Pierre", description: "Reference docs for rendering code and diffs on the web" },
    { href: "https://docs.convex.dev/home", label: "Convex docs", description: "Official Convex documentation and guides" },
    { href: "https://docs.convex.dev/components/authoring", label: "Authoring components", description: "Build reusable Convex components with isolated tables" },
    { href: "https://docs.convex.dev/components/using", label: "Using components", description: "Install and wire up Convex components in your app" },
    { href: "https://docs.convex.dev/components/understanding", label: "Understanding components", description: "How components, boundaries, and isolation work" },
    { href: "https://www.convex.dev/components/static-hosting", label: "Static hosting", description: "Serve your frontend from the same Convex deployment" },
    { href: "https://auth.estifanos.com/getting-started/installation/", label: "Convex Auth (Robelest)", description: "Password, OAuth, passkeys, groups, API keys, and SSO" },
    { href: "https://github.com/robelest/convex-auth", label: "Convex Auth GitHub", description: "Source code and examples for @robelest/convex-auth" },
    { href: "https://llmstxt.org", label: "llms.txt spec", description: "The llms.txt standard for AI agent discovery" },
    { href: "https://agents.md", label: "agents.md spec", description: "The agents.md standard for API contracts" },
    { href: "https://docs.convex.dev/llms.txt", label: "Convex llms.txt", description: "Convex's own llms.txt file" },
  ];
</script>

<div class="hero">
  <h1>Resources</h1>
  <p class="lede">
    Documentation, specs, and tools used by this component.
  </p>
</div>

<div class="file-grid">
  {#each links as link}
    <a
      class="file-tile"
      href={link.href}
      target={link.href.startsWith("/") ? undefined : "_blank"}
      rel={link.href.startsWith("/") ? undefined : "noreferrer"}
    >
      <span class="file-name">{link.label}</span>
      <span class="file-desc">{link.description}</span>
    </a>
  {/each}
</div>
