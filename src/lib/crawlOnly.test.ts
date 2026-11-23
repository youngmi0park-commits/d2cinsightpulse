import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { expect, it } from "vitest";

it("the direct collector searches via Firecrawl without reading or calling Bazaarvoice", async () => {
  const requestedKeys: string[] = [];
  const requestedUrls: string[] = [];
  const logSources: string[] = [];
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const chain = {
    insert: (row: { source: string }) => { logSources.push(row.source); return chain; },
    select: () => chain,
    single: async () => ({ data: { id: "test-log" } }),
    update: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: async () => ({ data: [] }),
  };
  const source = readFileSync(`${process.cwd()}/supabase/functions/crawl-lge-reviews/index.ts`, "utf8")
    .replace(/^import .*;\n/gm, "");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(js, {
    exports: {}, console, Response, Request, URL, setTimeout,
    createClient: () => ({ from: () => chain }),
    Deno: {
      env: { get: (key: string) => { requestedKeys.push(key); return "test-config"; } },
      serve: (fn: typeof handler) => { handler = fn; },
    },
    fetch: async (url: string) => {
      requestedUrls.push(url);
      return new Response(JSON.stringify({ data: [] }), { headers: { "Content-Type": "application/json" } });
    },
  });
  if (!handler) throw new Error("Collector did not register a handler");
  const response = await handler(new Request("https://app.example/collector", {
    method: "POST", body: JSON.stringify({ categories: ["Refrigerator"], regions: ["us"], maxQueries: 1 }),
  }));
  expect(await response.json()).toMatchObject({ success: true, collection_method: "crawl" });
  expect(requestedUrls).toEqual(["https://api.firecrawl.dev/v1/search"]);
  expect(requestedKeys.filter(key => key.startsWith("BAZAARVOICE"))).toEqual([]);
  expect(logSources).toEqual(["lge_com_direct"]);
});