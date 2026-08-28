// Pure HTTP scan of agent-readiness endpoints.
// Essential checks score; optional protocol endpoints report without lowering
// the score, matching how public scanners treat missing MCP-style extras.
export async function scan(args) {
  const configPath = args.config || "agent-ready.config.json";
  let appUrl = args.url;
  const strict = args.strict === true || args.strict === "true";

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
  const UA = "agent-ready-scanner/2.0";
  console.log(`Scanning ${base} for agent readiness...\n`);

  let essentialPasses = 0;
  let essentialTotal = 0;

  const get = (path, headers = {}) =>
    fetch(`${base}${path}`, { headers: { "User-Agent": UA, ...headers } });

  // ---- Essential file checks (scored) ----
  const essentialFiles = [
    { name: "llms.txt", path: "/llms.txt", checkHeaders: true },
    { name: "agents.md", path: "/agents.md", checkHeaders: true },
    { name: "robots.txt", path: "/robots.txt", checkHeaders: false },
    { name: "sitemap.xml", path: "/sitemap.xml", checkHeaders: false },
  ];

  console.log("Essential checks (scored):\n");
  for (const check of essentialFiles) {
    essentialTotal++;
    try {
      const res = await get(check.path);
      if (res.ok) {
        essentialPasses++;
        const etag = res.headers.get("etag") || "";
        const tokens = res.headers.get("x-markdown-tokens") || "";
        const signal = res.headers.get("content-signal") || "";
        const link = res.headers.get("link") || "";

        let details = `${res.status} OK`;
        if (etag) details += `  etag: ${etag}`;
        if (tokens) details += `  tokens: ${tokens}`;
        console.log(`PASS  ${check.name.padEnd(22)} ${details}`);

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
        if (check.path === "/robots.txt") {
          const body = await res.text();
          if (body.includes("Content-Signal:")) {
            console.log(`  OK  Content-Signal block inside robots.txt`);
          } else {
            console.log(`  WARN robots.txt has no Content-Signal block`);
          }
        }
      } else {
        console.log(`FAIL  ${check.name.padEnd(22)} ${res.status} ${res.statusText}`);
      }
    } catch {
      console.log(`FAIL  ${check.name.padEnd(22)} Network error`);
    }
  }

  // Essential: markdown negotiation on the /markdown route. SPA roots often
  // hide misconfigured route order, so /markdown is the reliable probe.
  essentialTotal++;
  try {
    const res = await get("/markdown", { Accept: "text/markdown, text/html" });
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/markdown")) {
      essentialPasses++;
      console.log(`PASS  ${"markdown-negotiation".padEnd(22)} Accept: text/markdown works`);
    } else {
      console.log(`FAIL  ${"markdown-negotiation".padEnd(22)} No markdown response for Accept: text/markdown`);
    }
  } catch {
    console.log(`FAIL  ${"markdown-negotiation".padEnd(22)} Network error`);
  }

  // Essential: real 404 probe. A 200 for a random path means an SPA fallback
  // (static hosting spaFallback or host rewrites) is answering. That is a
  // documented limit, not a failure: do not break client routing to chase it.
  essentialTotal++;
  try {
    const probePath = `/agent-ready-404-probe-${Date.now().toString(36)}`;
    const res = await get(probePath);
    if (res.status === 404) {
      essentialPasses++;
      console.log(`PASS  ${"404-probe".padEnd(22)} Unknown path returns 404`);
    } else if (res.status === 200) {
      essentialPasses++;
      console.log(`WARN  ${"404-probe".padEnd(22)} Unknown path returns 200 (SPA fallback serves index.html; known limit, not counted against you)`);
      console.log(`  TIP Enable notFoundPageEnabled so agents can recover via /404.md`);
    } else {
      console.log(`FAIL  ${"404-probe".padEnd(22)} Unknown path returns ${res.status}`);
    }
  } catch {
    console.log(`FAIL  ${"404-probe".padEnd(22)} Network error`);
  }

  // ---- Informational homepage checks (not scored) ----
  console.log("\nHomepage checks (informational):\n");
  try {
    const res = await get("/", { Accept: "text/html" });
    const link = res.headers.get("link") || "";
    if (link.includes("llms.txt")) {
      console.log(`  OK  Homepage Link header points at llms.txt`);
    } else {
      console.log(`  WARN Homepage has no llms.txt Link header (expected when the frontend is on a different origin)`);
    }
    const body = await res.text();
    if (body.length < 500) {
      console.log(`  WARN Homepage HTML is thin (${body.length} bytes). Agents without JS may see nothing.`);
    } else if (!/<h1[\s>]/i.test(body)) {
      console.log(`  WARN Homepage HTML has no <h1>. Add one for agent-readable structure.`);
    } else {
      console.log(`  OK  Homepage HTML has content and an <h1>`);
    }
  } catch {
    console.log(`  WARN Could not fetch homepage`);
  }

  // ---- Optional protocol endpoints (reported, never scored) ----
  const optionalChecks = [
    { name: "agent-skills", path: "/.well-known/agent-skills" },
    { name: "agent-skills index", path: "/.well-known/agent-skills/index.json" },
    { name: "api-catalog", path: "/.well-known/api-catalog" },
    { name: "404.md", path: "/404.md" },
    { name: "feed.xml (RSS)", path: "/feed.xml" },
    { name: "markdown index", path: "/llms-markdown-index" },
    { name: "llms-readiness", path: "/llms-readiness" },
    { name: "llms-status", path: "/llms-status" },
  ];

  console.log("\nOptional endpoints (not scored):\n");
  for (const check of optionalChecks) {
    try {
      const res = await get(check.path);
      if (res.ok) {
        console.log(`PASS  ${check.name.padEnd(22)} ${res.status} OK`);
      } else {
        console.log(`SKIP  ${check.name.padEnd(22)} ${res.status} (enable via npx agent-ready agent-ready)`);
      }
    } catch {
      console.log(`SKIP  ${check.name.padEnd(22)} Network error`);
    }
  }

  // ---- Strict mode: verify a real markdown page twin ----
  if (strict) {
    essentialTotal++;
    try {
      const indexRes = await get("/llms-markdown-index");
      const body = indexRes.ok ? await indexRes.json() : null;
      const firstPage = Array.isArray(body?.pages) ? body.pages[0] : null;
      if (!firstPage?.htmlUrl) {
        console.log(`FAIL  ${"markdown-page".padEnd(22)} No page found in /llms-markdown-index`);
      } else {
        const pageRes = await fetch(firstPage.htmlUrl, {
          headers: { Accept: "text/markdown, text/html", "User-Agent": UA },
        });
        const ct = pageRes.headers.get("content-type") || "";
        if (pageRes.ok && ct.includes("text/markdown")) {
          essentialPasses++;
          const original = pageRes.headers.get("x-original-tokens") || "";
          console.log(`PASS  ${"markdown-page".padEnd(22)} ${firstPage.slug} serves markdown${original ? ` (original tokens: ${original})` : ""}`);
        } else {
          console.log(`FAIL  ${"markdown-page".padEnd(22)} Page did not serve markdown`);
        }
      }
    } catch {
      console.log(`FAIL  ${"markdown-page".padEnd(22)} Network error`);
    }
  }

  const score = Math.round((essentialPasses / essentialTotal) * 100);
  console.log(`\nScore: ${score} / 100  (${essentialPasses}/${essentialTotal} essential checks passed)`);
  console.log("Optional endpoints never lower the score.");

  if (score < 80) {
    console.log("\nRun `npx agent-ready agent-ready` to enable all features.\n");
    process.exitCode = 1;
  } else {
    console.log("\nYour site is agent-ready.\n");
  }
}
