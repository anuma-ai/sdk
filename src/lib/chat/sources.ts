import type { LlmapiToolCallEvent } from "../../client";
import type { SearchSource } from "../db/chat";

export function extractSourcesFromToolCallEvents(
  toolCallEvents?: LlmapiToolCallEvent[]
): SearchSource[] {
  try {
    const extractedSources: SearchSource[] = [];
    const seenUrls = new Set<string>();

    if (toolCallEvents) {
      for (const toolCallEvent of toolCallEvents) {
        const outputStr = toolCallEvent.output || "";
        const toolName = toolCallEvent.name || "";

        if (toolName.includes("AnumaSearchMCP") && toolName.includes("text_search")) {
          try {
            const parsed = JSON.parse(outputStr) as Record<string, unknown>;
            const results = parsed?.results;
            if (Array.isArray(results)) {
              for (const result of results) {
                const r = result as Record<string, unknown>;
                const url = typeof r.url === "string" ? r.url : "";
                if (url && !seenUrls.has(url)) {
                  seenUrls.add(url);
                  const title = typeof r.title === "string" ? r.title : undefined;
                  const snippets = Array.isArray(r.snippets)
                    ? (r.snippets as string[]).filter((s) => typeof s === "string")
                    : [];
                  let snippet = snippets.join(" ").trim();
                  if (snippet.length > 250) {
                    snippet = snippet.slice(0, 250).trim() + "...";
                  }
                  extractedSources.push({
                    title: title || undefined,
                    url,
                    snippet: snippet || undefined,
                  });
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        }

        if (toolName.includes("BraveSearchMCP")) {
          try {
            const jsonObjectRegex = /\{[^{}]*"url"[^{}]*\}/g;
            let match: RegExpExecArray | null;

            while ((match = jsonObjectRegex.exec(outputStr)) !== null) {
              try {
                const result = JSON.parse(match[0]) as Record<string, unknown>;
                const resultUrl = typeof result.url === "string" ? result.url : "";
                if (resultUrl && !seenUrls.has(resultUrl)) {
                  seenUrls.add(resultUrl);
                  const rawDescription =
                    typeof result.description === "string" ? result.description : "";
                  const cleanDescription = rawDescription
                    .replace(/<[^>]*>/g, "")
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"')
                    .replace(/&#x27;/g, "'")
                    .replace(/&#39;/g, "'")
                    .replace(/&apos;/g, "'")
                    .replace(/&nbsp;/g, " ")
                    .trim();
                  const resultTitle = typeof result.title === "string" ? result.title : undefined;
                  extractedSources.push({
                    title: resultTitle || undefined,
                    url: resultUrl,
                    snippet: cleanDescription || undefined,
                  });
                }
              } catch {
                // Ignore individual JSON parse errors
              }
            }
          } catch {
            // Ignore tool call event parse errors
          }
        }

        if (toolName.includes("JinaMCP") && toolName.includes("search")) {
          try {
            const parsed = JSON.parse(outputStr) as Record<string, unknown>;
            const results = Array.isArray(parsed)
              ? (parsed as Record<string, unknown>[])
              : Array.isArray(parsed?.results)
                ? (parsed.results as Record<string, unknown>[])
                : Array.isArray(parsed?.data)
                  ? (parsed.data as Record<string, unknown>[])
                  : [];
            for (const r of results) {
              const url =
                (typeof r.url === "string" ? r.url : "") ||
                (typeof r.link === "string" ? r.link : "");
              if (url && !seenUrls.has(url)) {
                seenUrls.add(url);
                const title = typeof r.title === "string" ? r.title : undefined;
                let snippet =
                  (typeof r.snippet === "string" ? r.snippet : "") ||
                  (typeof r.description === "string" ? r.description : "") ||
                  (typeof r.content === "string" ? r.content : "");
                if (snippet.length > 250) {
                  snippet = snippet.slice(0, 250).trim() + "...";
                }
                extractedSources.push({
                  title: title || undefined,
                  url,
                  snippet: snippet || undefined,
                });
              }
            }
          } catch {
            // Ignore JinaMCP parse errors
          }
        }

        if (toolName.includes("PerplexityMCP")) {
          try {
            const resultPattern = /(\d+)\.\s+\*\*([^*]+)\*\*\s*\n\s*URL:\s*(https?:\/\/[^\s\n]+)/g;
            let match: RegExpExecArray | null;

            while ((match = resultPattern.exec(outputStr)) !== null) {
              const title = match[2]?.trim();
              const url = match[3]?.trim();

              if (url && !seenUrls.has(url)) {
                seenUrls.add(url);

                const matchEnd = match.index + match[0].length;
                const nextResultMatch = outputStr.slice(matchEnd).match(/\n\d+\.\s+\*\*/);
                const dateMatch = outputStr.slice(matchEnd).match(/\n\s*Date:\s*\d{4}-\d{2}-\d{2}/);

                let snippetEnd = outputStr.length;
                if (nextResultMatch?.index !== undefined) {
                  snippetEnd = Math.min(snippetEnd, matchEnd + nextResultMatch.index);
                }
                if (dateMatch?.index !== undefined) {
                  snippetEnd = Math.min(snippetEnd, matchEnd + dateMatch.index);
                }

                let snippet = outputStr
                  .slice(matchEnd, snippetEnd)
                  .replace(/\{ts:\d+\}/g, "")
                  .replace(/^#{1,6}\s*/gm, "")
                  .replace(/\*{1,2}/g, "")
                  .replace(/\|[^|\n]+\|/g, "")
                  .replace(/\n{2,}/g, " ")
                  .replace(/\s{2,}/g, " ")
                  .trim();

                if (snippet.length > 250) {
                  snippet = snippet.slice(0, 250).trim() + "...";
                }

                extractedSources.push({
                  title: title || undefined,
                  url,
                  snippet: snippet || undefined,
                });
              }
            }
          } catch {
            // Ignore Perplexity parse errors
          }
        }
      }
    }

    return extractedSources;
  } catch {
    return [];
  }
}
