# MCP-aligned connectors

Caulfield does **not** run arbitrary stdio MCP servers on Vercel (serverless has no long-lived process). Instead, the **Marketplace** registers **connectors** whose capabilities appear as normal **chat tools** in [`/api/chat`](../app/api/chat/route.ts).

This matches the MCP idea—structured, discoverable tools—while using **HTTPS + user-provided API keys** forwarded from the browser inside each chat request.

**Built-in connectors** (no vendor key): **native web lookup** (DuckDuckGo + Wikipedia) and **GitHub** (REST; optional PAT) are implemented the same way—`fetch` from `/api/chat` with timeouts and truncated tool output.

A future extension could add **Streamable HTTP MCP** clients (`@modelcontextprotocol/sdk`) for user-supplied remote MCP URLs; that is optional and not required for Context7 or Exa today.
