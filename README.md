# ABAP Community MCP Server

> **Community Project** -- This is an independent, community-driven MCP server. It is **not** an official SAP product and is not affiliated with or endorsed by SAP SE.

A dedicated MCP server for ABAP and RAP development in ADT (Eclipse). Provides unified search across ABAP documentation, code samples, and style guides, plus local ABAP linting. Built and maintained by the ABAP community.

Use it online at https://mcp-abap.marianzeis.de/mcp

**Use it locally** for full ABAP development support including offline documentation search and code linting.

---

## Quick Start (for local use)

```bash
# Clone and setup
git clone https://github.com/marianfoo/abap-mcp-server.git
cd abap-mcp-server
npm ci
./setup.sh  # Clone documentation submodules
npm run build


# start the Streamable HTTP server
npm run start:streamable
```

---

## Eclipse Configuration (GitHub Copilot)

To use this MCP server with GitHub Copilot in Eclipse, you need to configure the MCP server settings.

For more details, see the [official documentation](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp/change-mcp-registry).

### Configuration

Add the server configuration using one of the methods below.

#### Option 1: Remote Server (Easiest)

Use the hosted version without any local installation.

```json
{
  "servers": {
    "abap-docs": {
      "url": "https://mcp-abap.marianzeis.de/mcp"
    }
  }
}
```

#### Option 2: Local Server (Advanced)

Run the server locally for offline access and local linting.

1. Start the local streamable server:
   ```bash
   npm run start:streamable
   ```
2. Configure Eclipse to connect to your local instance:

```json
{
  "servers": {
    "abap-docs": {
      "url": "http://127.0.0.1:3122/mcp"
    }
  }
}
```


## What You Get

### 🔍 **Unified ABAP Documentation Search**
- **search** – Search across all ABAP documentation sources with intelligent filtering
  - Automatic ABAP flavor detection (Standard vs Cloud)
  - Online search enabled by default (`includeOnline: true`) with best-effort sources (SAP Help Portal + SAP Community + Software-Heroes) and a 10s timeout (worst-case)
  - Restrict offline sources via `sources`, and control sample-heavy sources via `includeSamples`
- **fetch** – Retrieve complete documents with formatting

### ✨ **Local ABAP Linting**
- **abap_lint** – Static code analysis using abaplint
  - Lint local ABAP files and directories
  - Returns structured findings (file, line, message, severity)
  - Configurable via abaplint.json

### 📊 **ABAP Feature Matrix** (Software Heroes)
- **abap_feature_matrix** – Check ABAP feature availability across SAP releases
  - Data from [Software Heroes ABAP Feature Matrix](https://software-heroes.com/en/abap-feature-matrix)
  - Search for features and see which releases support them
  - Results cached for 24 hours for fast performance

---

## Available Tools

### `search` - Unified ABAP/RAP Documentation Search

Search across all ABAP documentation sources with intelligent filtering.

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | (required) | Search terms for ABAP/RAP documentation |
| `k` | number | 50 | Number of results to return (1–100) |
| `includeOnline` | boolean | true | Include online sources (SAP Help, SAP Community, Software-Heroes). Keep this on; only turn it off if online search is blocked/slow/unreliable or you explicitly want offline-only sources. |
| `includeSamples` | boolean | true | Include sample-heavy offline sources (cheat sheets, showcases, example repos). Turn this off if results are flooded by examples and you want more reference/guidance docs. |
| `abapFlavor` | "standard" \| "cloud" \| "auto" | "auto" | Filter by ABAP flavor |
| `sources` | string[] | all | Restrict OFFLINE search to specific source IDs (online sources are controlled via `includeOnline`) |

**Examples:**
```
search(query="SELECT FOR ALL ENTRIES")
search(query="RAP behavior definition", abapFlavor="cloud")
search(query="CDS annotations", includeSamples=false)         # less code-heavy
search(query="RAP troubleshooting", includeOnline=true)       # explicit (default is true)
search(query="LOOP AT GROUP BY", includeOnline=false)         # offline-only fallback
```

### `fetch` - Get Full Document Content

Retrieve complete document content from search results.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Document ID from search results |

### `abap_lint` - Local ABAP Code Linting

Run abaplint static analysis on local ABAP files.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `paths` | string[] | Array of file or directory paths to lint |
| `configPath` | string | Optional path to abaplint.json configuration |

**Returns:**
```json
{
  "findings": [
    {
      "file": "/path/to/file.abap",
      "startLine": 10,
      "startColumn": 1,
      "endLine": 10,
      "endColumn": 20,
      "message": "Use NEW instead of CREATE OBJECT",
      "severity": "warning",
      "ruleKey": "use_new"
    }
  ],
  "totalFiles": 5,
  "errorCount": 0,
  "warningCount": 3,
  "infoCount": 1,
  "success": true
}
```

### `abap_feature_matrix` - ABAP Feature Availability

Search the Software Heroes ABAP Feature Matrix to check feature availability across SAP releases.

**Data Source:** [software-heroes.com/en/abap-feature-matrix](https://software-heroes.com/en/abap-feature-matrix)

**How it works:** The server always fetches the **full matrix in English**, caches the parsed result for **24 hours**, and performs **local filtering**. If `query` is omitted/empty, it returns the full feature list (optionally limited via `limit`).

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | (optional) | Feature keywords to search for. If omitted/empty, returns all features. |
| `limit` | number | (none) | Maximum number of results. If omitted, returns all matching features. |

**Status Markers:**
- ✅ `available` - Feature is available in the release
- ❌ `unavailable` - Feature is not available
- ⭕ `deprecated` - Feature is deprecated
- ❔ `needs_review` - Status needs verification
- 🔽 `downport` - Feature was backported from a newer release

**Examples:**
```
abap_feature_matrix(query="inline declaration")
abap_feature_matrix(query="CORRESPONDING")
abap_feature_matrix(limit=50)              # first 50 features (no query)
abap_feature_matrix(query="CDS", limit=10)
```

**Returns:**
```json
{
  "matches": [
    {
      "feature": "Inline Declarations in SELECT",
      "section": "ABAP SQL",
      "link": "https://help.sap.com/...",
      "statusByRelease": {
        "7.40": "unavailable",
        "7.50": "available",
        "LATEST": "available"
      },
      "score": 15
    }
  ],
  "meta": {
    "totalFeatures": 150,
    "totalSections": 12,
    "sections": ["ABAP SQL", "ABAP Statements"]
  },
  "sourceUrl": "https://software-heroes.com/en/abap-feature-matrix",
  "legend": {
    "✅": "Available",
    "❌": "Not available"
  }
}
```

---

## Documentation Sources

### Offline Sources (local FTS index)

These are always searched unless you restrict them via `sources`. The entries marked as **sample-heavy** are controlled by `includeSamples`.

| Source ID | Sample-heavy | What to expect |
|-----------|--------------|----------------|
| `abap-docs-standard` | no | Official ABAP Keyword Documentation for on‑premise systems (full syntax). Best for statement syntax + semantics. |
| `abap-docs-cloud` | no | Official ABAP Keyword Documentation for ABAP Cloud/BTP (restricted syntax). Best for Steampunk/BTP constraints. |
| `sap-styleguides` | no | SAP Clean ABAP Style Guide + best practices (includes translations; non‑English duplicates are filtered). |
| `dsag-abap-leitfaden` | no | DSAG ABAP Leitfaden (German) with ABAP development guidelines and best practices. |
| `abap-cheat-sheets` | yes | Many practical ABAP/RAP snippets; quick “how-to” reference (can dominate broad queries). |
| `abap-fiori-showcase` | yes | Annotation-driven RAP + OData V4 + Fiori Elements feature showcase. |
| `abap-platform-rap-opensap` | yes | openSAP “Building Apps with RAP” course samples (ABAP/CDS). |
| `cloud-abap-rap` | yes | ABAP Cloud + RAP example projects (ABAP/CDS). |
| `abap-platform-reuse-services` | yes | RAP reuse services examples (number ranges, change documents, mail, Adobe Forms, ...). |

### Online Sources (when `includeOnline=true`, default)

Online search is best-effort and runs in parallel with a 10s timeout (worst-case). Turn it off only if you have connectivity issues or explicitly want offline-only results.

| Source ID | What to expect | Notes |
|----------|-----------------|------|
| `sap-help` | SAP Help Portal product documentation (official, broad scope). | Can be very good for product docs; can also be noisy because scope is huge. |
| `sap-community` | SAP Community blogs + Q&A + troubleshooting (practical, quality varies). | Great for “how do I fix…?” queries. |
| `software-heroes` | Software Heroes ABAP/RAP articles & tutorials. | Searched in **EN + DE** and deduplicated by URL; feed search is disabled. |

---

## Example Prompts

### ABAP Keyword Documentation
- "What is the syntax for SELECT FOR ALL ENTRIES in ABAP?"
- "How do I use LOOP AT GROUP BY in modern ABAP?"
- "Show me exception handling with TRY-CATCH"
- "What are constructor expressions for VALUE and CORRESPONDING?"

### ABAP Cloud vs Standard
- "Show me ABAP Cloud compatible SELECT syntax" (uses `abapFlavor="cloud"`)
- "What ABAP statements are restricted in ABAP Cloud?"
- "How do I migrate classic ABAP to ABAP Cloud?"

### RAP Development
- "How do I define a RAP behavior definition?"
- "Show me RAP action implementation examples"
- "What are CDS annotation patterns for Fiori Elements?"
- "How do I implement validations and determinations in RAP?"

### Clean Code & Style
- "What does Clean ABAP say about method parameters?"
- "Show me ABAP naming conventions"
- "Find DSAG guidelines for ABAP OOP"

### With Online Sources
- "Search SAP Community for RAP troubleshooting" (`includeOnline=true`)
- "Find SAP Help documentation on ABAP Cloud development" (`includeOnline=true`)

### Feature Availability (Software Heroes)
- "Is inline declaration available in SAP 7.40?"
- "When was CDS View Entity introduced?"
- "Show me features available from release 7.54"
- "Check if CORRESPONDING constructor works in my release"

---

## Build Commands

```bash
npm run build:tsc       # Compile TypeScript
npm run build:index     # Build search index from sources
npm run build:fts       # Build FTS5 database  
npm run build           # Complete build pipeline (tsc + index + fts)
npm run setup           # Complete setup (submodules + build)
```

## Server Commands

```bash
npm start                    # Start STDIO MCP server
npm run start:streamable     # Start Streamable HTTP MCP server (port 3122)
```

---

## Self-Hosting with Docker

Run your own instance of the MCP server on a VPS behind a reverse proxy (Nginx, Traefik, Caddy, etc.).

<details>
<summary><b>Quick Start</b></summary>

```bash
# Build the image
docker build -t abap-community-mcp-server .

# Run the container
docker run -d -p 3122:3122 --name abap-community-mcp-server abap-community-mcp-server

# Verify it's running
curl http://localhost:3122/health
```

Connect your MCP client to: `http://your-server:3122/mcp`

</details>

<details>
<summary><b>Docker Compose (Recommended)</b></summary>

Create a `docker-compose.yml`:

```yaml
services:
  abap-community-mcp-server:
    build: .
    ports:
      - "3122:3122"
    restart: unless-stopped
    healthcheck:
      # Note: requires Node.js >= 18 for global fetch() support
      test: ["CMD", "node", "-e", "fetch('http://localhost:3122/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Then run:

```bash
docker compose up -d
```

</details>

<details>
<summary><b>Environment Variables</b></summary>

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_HOST` | `127.0.0.1` (local) / `0.0.0.0` (Docker) | MCP (Streamable HTTP) server bind address |
| `MCP_PORT` | `3122` | MCP (Streamable HTTP) server port |
| `HOST` | `127.0.0.1` | HTTP status server bind address |
| `NODE_ENV` | `production` | Environment mode |
| `LOG_LEVEL` | `INFO` | Log verbosity (DEBUG, INFO, WARN, ERROR) |
| `RETURN_K` | `50` | Default number of search results to return |
| `SOFTWARE_HEROES_CLIENT` | `ABAPCOMMUNITYMCPSERVER` | Client identifier for Software Heroes API (sent in headers) |
| `SOFTWARE_HEROES_TIMEOUT_MS` | `10000` | Timeout for Software Heroes API requests (ms) |
| `SOFTWARE_HEROES_CACHE_TTL_MS` | `86400000` | Cache TTL for Software Heroes API responses (content search + feature matrix, 24h default) |

The Dockerfile sets `MCP_HOST=0.0.0.0` by default to allow connections from outside the container. If you also expose the HTTP status server, configure `HOST` accordingly.

</details>

<details>
<summary><b>Auto-Update Strategies</b></summary>

Since Docker containers are immutable, here are strategies to keep documentation updated:

### Option 1: Scheduled Image Rebuild (Recommended)

Add a cron job to rebuild daily:

```bash
# crontab -e (runs at 4 AM)
0 4 * * * cd /path/to/abap-mcp-server && docker compose build --no-cache && docker compose up -d
```

### Option 2: Watchtower (for registry-based images)

If you publish images to a registry:

```yaml
services:
  abap-community-mcp-server:
    image: ghcr.io/marianfoo/abap-mcp-server:latest
    ports:
      - "3122:3122"
    restart: unless-stopped
    
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400  # Check daily (24h)
```

### Option 3: Volume Mounts with External Updates

Mount sources as volumes and update externally:

```yaml
services:
  abap-community-mcp-server:
    build: .
    ports:
      - "3122:3122"
    volumes:
      - ./sources:/app/sources:ro
      - ./dist/data:/app/dist/data:ro
```

Then run a host cron job to update sources and rebuild the index.

</details>

---

## Architecture

- **MCP Server** (Node.js/TypeScript) – Exposes search, fetch, and abap_lint tools
- **BM25 Search Engine** – SQLite FTS5 with optimized full-text search
- **abaplint Integration** – Local ABAP static analysis via @abaplint/core
- **Streamable HTTP Transport** – Latest MCP protocol with session management

### Technical Stack
- **Search Engine**: BM25 with SQLite FTS5 (~15ms average query time)
- **Linting**: @abaplint/core for ABAP Cloud compatibility checks
- **Transport**: MCP protocol with STDIO and HTTP Streamable support

---

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Credits

- ABAP documentation sources from various SAP and community repositories
- [abaplint](https://github.com/abaplint/abaplint) for ABAP static analysis
- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Software Heroes](https://software-heroes.com/) (Björn Schulz) for offering the ABAP Feature Matrix and content search APIs