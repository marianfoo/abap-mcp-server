# ABAP/RAP MCP Server

A dedicated MCP server for ABAP and RAP development in ADT (Eclipse). Provides unified search across ABAP documentation, code samples, and style guides, plus local ABAP linting.

Use it online at https://mcp-abap.marianzeis.de/mcp

**Use it locally** for full ABAP development support including offline documentation search and code linting.

---

## Quick Start

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
  "mcpServers": {
    "abap-mcp": {
      "type": "sse",
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
  "mcpServers": {
    "abap-mcp": {
      "type": "sse",
      "url": "http://127.0.0.1:3122/mcp"
    }
  }
}
```


## What You Get

### 🔍 **Unified ABAP Documentation Search**
- **search** – Search across all ABAP documentation sources with intelligent filtering
  - Automatic ABAP flavor detection (Standard vs Cloud)
  - Optional online search (SAP Help Portal + SAP Community) with 10s timeout
  - Filter by specific sources or include code samples
- **fetch** – Retrieve complete documents with formatting

### ✨ **Local ABAP Linting**
- **abap_lint** – Static code analysis using abaplint
  - Lint local ABAP files and directories
  - Returns structured findings (file, line, message, severity)
  - Configurable via abaplint.json

---

## Available Tools

### `search` - Unified ABAP/RAP Documentation Search

Search across all ABAP documentation sources with intelligent filtering.

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | (required) | Search terms for ABAP/RAP documentation |
| `includeOnline` | boolean | false | Include SAP Help Portal and SAP Community (adds ~10s latency) |
| `includeSamples` | boolean | true | Include code-heavy sample repositories |
| `abapFlavor` | "standard" \| "cloud" \| "auto" | "auto" | Filter by ABAP flavor |
| `sources` | string[] | all | Specific source IDs to search |

**Examples:**
```
search(query="SELECT FOR ALL ENTRIES")
search(query="RAP behavior definition", abapFlavor="cloud")
search(query="CDS annotations", includeOnline=true)
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

---

## Documentation Sources

### Core ABAP Documentation
| Source ID | Description |
|-----------|-------------|
| `abap-docs-standard` | Official ABAP Keyword Documentation (Standard/On-Premise, full syntax) |
| `abap-docs-cloud` | Official ABAP Keyword Documentation (ABAP Cloud/BTP, restricted syntax) |
| `abap-cheat-sheets` | ABAP Cheat Sheets with practical examples for ABAP and RAP |
| `sap-styleguides` | SAP Clean ABAP Style Guide and best practices |
| `dsag-abap-leitfaden` | DSAG ABAP Development Guidelines (German) |

### RAP & Fiori Elements
| Source ID | Description |
|-----------|-------------|
| `abap-fiori-showcase` | ABAP RAP Fiori Elements Feature Showcase (annotations, UI patterns) |
| `abap-platform-rap-opensap` | RAP openSAP Course Samples |
| `cloud-abap-rap` | ABAP Cloud + RAP Examples |
| `abap-platform-reuse-services` | RAP Reuse Services (Number Ranges, Change Documents, etc.) |

### Online Sources (when `includeOnline=true`)
- **SAP Help Portal** (help.sap.com) – Official product documentation
- **SAP Community** – Blog posts, discussions, troubleshooting solutions

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
