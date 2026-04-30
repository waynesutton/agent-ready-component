// Pure HTTP scan of agent-readiness endpoints
export async function scan(args) {
  const configPath = args.config || "agent-ready.config.json";
  let appUrl = args.url;

  if (!appUrl) {
    try {
      const { readFileSync } = await import("node:fs");
      const { resolve } = await import("node:path");
      const config = JSON.parse(readFileSync(resolve(process.cwd(), configPath), "utf-8"));
      appUrl = config.settings?.appUrl;
    } catch {
      // fall through
    }
  }

  if (!appUrl) {
    console.error("No --url provided and no appUrl in config. Usage: npx agent-ready scan --url https://your.site");
    process.exitCode = 1;
    return;
  }

  const base = appUrl.replace(/\/$/, "");
  console.log(`Scanning ${base} for agent readiness...\n`);

  const checks = [
    { name: "llms.txt", path: "/llms.txt", checkHeaders: true },
    { name: "agents.md", path: "/agents.md", checkHeaders: true },
    { name: "robots.txt", path: "/robots.txt", checkHeaders: false },
    { name: "sitemap.xml", path: "/sitemap.xml", checkHeaders: false },
    { name: "agent-skills", path: "/.well-known/agent-skills", checkHeaders: false },
    { name: "feed.xml (RSS)", path: "/feed.xml", checkHeaders: false },
    { name: "llms-readiness", path: "/llms-readiness", checkHeaders: false },
    { name: "llms-status", path: "/llms-status", checkHeaders: false },
  ];

  let passes = 0;
  let total = 0;

  for (const check of checks) {
    total++;
    try {
      const res = await fetch(`${base}${check.path}`, {
        headers: { "User-Agent": "agent-ready-scanner/1.0" },
      });

      if (res.ok) {
        passes++;
        const etag = res.headers.get("etag") || "";
        const tokens = res.headers.get("x-markdown-tokens") || "";
        const signal = res.headers.get("content-signal") || "";
        const link = res.headers.get("link") || "";

        let details = `${res.status} OK`;
        if (etag) details += `  etag: ${etag}`;
        if (tokens) details += `  tokens: ${tokens}`;
        console.log(`PASS  ${check.name.padEnd(20)} ${details}`);

        if (check.checkHeaders) {
          if (signal) {
            console.log(`  OK  Content-Signal: ${signal}`);
          } else {
            console.log(`  WARN Content-Signal header missing`);
          }
          if (link) {
            console.log(`  OK  Link: ${link.slice(0, 80)}...`);
          }
        }
      } else {
        console.log(`FAIL  ${check.name.padEnd(20)} ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.log(`FAIL  ${check.name.padEnd(20)} Network error`);
    }
  }

  // Check markdown negotiation
  total++;
  try {
    const res = await fetch(`${base}/`, {
      headers: { Accept: "text/markdown, text/html", "User-Agent": "agent-ready-scanner/1.0" },
    });
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/markdown")) {
      passes++;
      console.log(`PASS  ${"markdown-negotiation".padEnd(20)} Accept: text/markdown works`);
    } else {
      console.log(`FAIL  ${"markdown-negotiation".padEnd(20)} No markdown response for Accept: text/markdown`);
    }
  } catch {
    console.log(`FAIL  ${"markdown-negotiation".padEnd(20)} Network error`);
  }

  const score = Math.round((passes / total) * 100);
  console.log(`\nScore: ${score} / 100  (${passes}/${total} checks passed)`);

  if (score < 80) {
    console.log("\nRun `npx agent-ready agent-ready` to enable all features.\n");
    process.exitCode = 1;
  } else {
    console.log("\nYour site is agent-ready.\n");
  }
}
