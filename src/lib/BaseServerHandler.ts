/**
 * Base Server Handler - ABAP/RAP-focused MCP server
 * Provides unified search across ABAP documentation resources for ADT (Eclipse) usage
 * 
 * IMPORTANT FOR LLMs/AI ASSISTANTS:
 * =================================
 * This MCP server provides tools for ABAP/RAP development:
 * - search: Unified search across ABAP documentation (offline + optional online)
 * - fetch: Retrieve full document content
 * - abap_lint: Local ABAP code linting
 * 
 * The function names may appear with different prefixes depending on your MCP client:
 * - Simple names: search, fetch, abap_lint
 * - Prefixed names: mcp_abap-mcp-server_search, etc.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import {
  searchLibraries,
  fetchLibraryDocumentation
} from "./localDocs.js";
import { lintAbapCode, LintResult } from "./abaplint.js";

import { SearchResponse } from "./types.js";
import { logger } from "./logger.js";
import { search } from "./search.js";
import { CONFIG } from "./config.js";
import { loadMetadata, getDocUrlConfig } from "./metadata.js";
import { generateDocumentationUrl, formatSearchResult } from "./url-generation/index.js";

/**
 * Helper functions for creating structured JSON responses compatible with ChatGPT and all MCP clients
 */

interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  score?: number;
  metadata?: Record<string, any>;
}

interface DocumentResult {
  id: string;
  title: string;
  text: string;
  url: string;
  metadata?: Record<string, any>;
}

/**
 * Create structured JSON response for search results (ChatGPT-compatible)
 */
function createSearchResponse(results: SearchResult[]): any {
  // Clean the results to avoid JSON serialization issues in MCP protocol
  const cleanedResults = results.map(result => ({
    // ChatGPT requires: id, title, url (other fields optional)
    id: result.id,
    title: result.title ? result.title.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n') : result.title,
    url: result.url,
    // Additional fields for enhanced functionality
    snippet: result.snippet ? result.snippet.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n') : result.snippet,
    score: result.score,
    metadata: result.metadata
  }));
  
  // ChatGPT expects: { "results": [...] } in JSON-encoded text content
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ results: cleanedResults })
      }
    ]
  };
}

/**
 * Create structured JSON response for document fetch (ChatGPT-compatible)
 */
function createDocumentResponse(document: DocumentResult): any {
  // Clean the text content to avoid JSON serialization issues in MCP protocol
  const cleanedDocument = {
    // ChatGPT requires: id, title, text, url, metadata
    id: document.id,
    title: document.title,
    text: document.text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars except \n, \r, \t
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n'), // Convert remaining \r to \n
    url: document.url,
    metadata: document.metadata
  };
  
  // ChatGPT expects document object as JSON-encoded text content
  return {
    content: [
      {
        type: "text", 
        text: JSON.stringify(cleanedDocument)
      }
    ]
  };
}

/**
 * Create error response in structured JSON format
 */
function createErrorResponse(error: string, requestId?: string): any {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ 
          error,
          requestId: requestId || 'unknown'
        })
      }
    ]
  };
}

export interface ServerConfig {
  name: string;
  description: string;
  version: string;
}

/**
 * Helper function to extract client metadata from request
 */
function extractClientMetadata(request: any): Record<string, any> {
  const metadata: Record<string, any> = {};
  
  // Try to extract available metadata from the request
  if (request.meta) {
    metadata.meta = request.meta;
  }
  
  // Extract any client identification from headers or other sources
  if (request.headers) {
    metadata.headers = request.headers;
  }
  
  // Extract transport information if available
  if (request.transport) {
    metadata.transport = request.transport;
  }
  
  // Extract session or connection info
  if (request.id) {
    metadata.requestId = request.id;
  }
  
  return metadata;
}

/**
 * Base Server Handler Class
 * Provides ABAP/RAP-focused MCP server functionality for ADT (Eclipse) usage
 */
export class BaseServerHandler {
  
  /**
   * Configure server with tool handlers
   */
  static configureServer(srv: Server): void {
    this.setupToolHandlers(srv);

    const capabilities = (srv as unknown as { _capabilities?: { prompts?: object } })._capabilities;
    if (capabilities?.prompts) {
      this.setupPromptHandlers(srv);
    }
  }

  /**
   * Setup tool handlers for ABAP/RAP-focused MCP server
   */
  private static setupToolHandlers(srv: Server): void {
    // List available tools
    srv.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "search",
            description: `SEARCH ABAP/RAP DOCUMENTATION: search(query="search terms")

FUNCTION NAME: search

This is a unified search tool for ABAP and RAP development documentation. It searches across multiple offline sources and can optionally include online sources (SAP Help Portal, SAP Community).

AVAILABLE OFFLINE SOURCES (searched by default):
• abap-docs-standard: Official ABAP Keyword Documentation for Standard ABAP (on-premise, full syntax)
• abap-docs-cloud: Official ABAP Keyword Documentation for ABAP Cloud (BTP, restricted syntax)
• abap-cheat-sheets: ABAP Cheat Sheets with practical examples and code snippets
• sap-styleguides: SAP Clean ABAP Style Guide and best practices
• dsag-abap-leitfaden: DSAG ABAP Development Guidelines (German)
• abap-fiori-showcase: ABAP RAP Fiori Elements Feature Showcase (RAP + annotations)
• abap-platform-rap-opensap: RAP course samples from openSAP
• cloud-abap-rap: ABAP Cloud + RAP examples
• abap-platform-reuse-services: RAP reuse services examples

OPTIONAL ONLINE SOURCES (when includeOnline=true):
• SAP Help Portal (help.sap.com): Official product documentation
• SAP Community: Blog posts, discussions, troubleshooting solutions

PARAMETERS:
• query (required): Search terms. Be specific and use technical ABAP/RAP terminology.
• k (optional, default=50): Number of results to return.
• includeOnline (optional, default=true): Search SAP Help Portal and SAP Community in addition to offline docs. Online searches have a 10-second timeout. Set to false for faster offline-only search.
• includeSamples (optional, default=true): Include code-heavy sample repositories in results.
• abapFlavor (optional, default="auto"): Filter by ABAP flavor:
  - "standard": Only Standard ABAP (on-premise, full syntax)
  - "cloud": Only ABAP Cloud (BTP, restricted syntax)
  - "auto": Detect from query (add "cloud" or "btp" for cloud, otherwise standard)
• sources (optional): Array of specific source IDs to search (e.g., ["abap-docs-standard", "abap-cheat-sheets"])

RETURNS (JSON array of results, each containing):
• id: Document identifier (use with fetch to get full content)
• title: Document title
• url: Link to documentation
• snippet: Text excerpt from document
• score: Relevance score (RRF-fused from multiple sources)
• library_id: Source library identifier
• metadata.source: Source ID (abap-docs-standard, sap-help, etc.)
• metadata.sourceKind: "offline" | "sap_help" | "sap_community"

TYPICAL WORKFLOW:
1. search(query="your ABAP/RAP question")
2. fetch(id="result_id_from_step_1") to get full content

QUERY TIPS:
• Be specific: "RAP behavior definition" not just "RAP"
• Include ABAP keywords: "SELECT FOR ALL ENTRIES", "LOOP AT GROUP BY"
• For ABAP Cloud: Add "cloud" or "btp" to query, or set abapFlavor="cloud"
• For faster search: Set includeOnline=false to skip online sources
• For implementation examples: Ensure includeSamples=true`,
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search terms for ABAP/RAP documentation. Be specific and use technical terms."
                },
                k: {
                  type: "number",
                  description: "Number of results to return. Default: 50.",
                  default: 50,
                  minimum: 1,
                  maximum: 100
                },
                includeOnline: {
                  type: "boolean",
                  description: "Search SAP Help Portal and SAP Community in addition to offline docs (adds ~1-2s latency). Set to false for faster offline-only search. Default: true.",
                  default: true
                },
                includeSamples: {
                  type: "boolean",
                  description: "Include code-heavy sample repositories in results. Default: true.",
                  default: true
                },
                abapFlavor: {
                  type: "string",
                  enum: ["standard", "cloud", "auto"],
                  description: "Filter by ABAP flavor: 'standard' (on-premise), 'cloud' (BTP), or 'auto' (detect from query). Default: auto.",
                  default: "auto"
                },
                sources: {
                  type: "array",
                  items: { type: "string" },
                  description: "Optional: specific source IDs to search. If not provided, searches all ABAP sources."
                }
              },
              required: ["query"]
            }
          },
          {
            name: "fetch",
            description: `GET FULL DOCUMENT CONTENT: fetch(id="result_id")

FUNCTION NAME: fetch

Retrieves the full content of a document from search results.

USAGE:
1. First use search() to find relevant documents
2. Use the 'id' from search results to fetch full content
3. Returns complete document text with metadata

PARAMETERS:
• id (required): Document ID from search results. Use the exact ID returned by search.

RETURNS:
• id: Document identifier
• title: Document title
• text: Full document content (markdown or code)
• url: Link to online documentation (if available)
• metadata: Source information and content details`,
            inputSchema: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Document ID from search results. Use exact IDs returned by search.",
                  examples: [
                    "/abap-docs-standard/abapselect",
                    "/abap-docs-cloud/abaploop",
                    "/abap-cheat-sheets/rap",
                    "/sap-styleguides/clean-abap"
                  ]
                }
              },
              required: ["id"]
            }
          },
          {
            name: "abap_lint",
            description: `LINT ABAP CODE: abap_lint(code="DATA lv_test TYPE string.")

FUNCTION NAME: abap_lint

Runs static code analysis on ABAP source code using abaplint.
Pass ABAP code directly as a string - no files needed.

LIMITS:
• Maximum code size: 50KB - larger code will be rejected
• Execution timeout: 10 seconds - complex code may timeout

HOW IT WORKS:
1. Pass ABAP source code as a string
2. The tool automatically detects the ABAP file type from the code content
3. Returns structured findings with line numbers, messages, and severity

AUTO-DETECTION (no filename needed):
The tool automatically detects the correct file type from code patterns:
• CLASS ... DEFINITION -> .clas.abap
• INTERFACE ... -> .intf.abap
• FUNCTION-POOL / FUNCTION -> .fugr.abap
• REPORT / PROGRAM -> .prog.abap
• TYPE-POOL -> .type.abap
• DEFINE VIEW / CDS -> .ddls.asddls
• DEFINE BEHAVIOR -> .bdef.asbdef
• DEFINE ROLE -> .dcls.asdcls
• Code snippets without clear type -> .clas.abap (default, enables most rules)

PARAMETERS:
• code (required): ABAP source code to analyze as a string (max 50KB)
• filename (optional): Override auto-detection with explicit filename (e.g., "test.clas.abap"). Only needed if auto-detection fails for unusual code patterns.
• version (optional): ABAP version - "Cloud" (default) or "Standard"

RETURNS JSON with:
• findings: Array of lint issues, each containing:
  - line: Line number where issue starts
  - column: Column number where issue starts  
  - endLine: Line number where issue ends
  - endColumn: Column number where issue ends
  - message: Description of the issue
  - severity: "error" | "warning" | "info"
  - ruleKey: abaplint rule identifier (e.g., "unused_variables", "keyword_case")
• errorCount: Total errors found
• warningCount: Total warnings found
• infoCount: Total info messages found
• success: Boolean indicating if lint completed successfully
• error: Error message if lint failed (includes size/timeout errors)

EXAMPLE:
abap_lint(code="CLASS zcl_test DEFINITION PUBLIC.\\n  PUBLIC SECTION.\\n    DATA: lv_unused TYPE string.\\nENDCLASS.")

RULES CHECKED:
• Syntax errors and unknown types
• Unused variables and unreachable code
• ABAP Cloud compatibility (obsolete statements)
• Naming conventions (classes, variables, methods)
• Code style (indentation, line length, keyword case)
• Best practices (prefer XSDBOOL, use NEW, etc.)

USE CASES:
• Validate code snippets before implementing
• Check code for ABAP Cloud compatibility  
• Find syntax errors and best practice violations
• Review generated or suggested code`,
            inputSchema: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  description: "ABAP source code to analyze (max 50KB)"
                },
                filename: {
                  type: "string",
                  description: "Optional: Override auto-detection with explicit filename (e.g., 'myclass.clas.abap'). Usually not needed - the tool auto-detects file type from code content."
                },
                version: {
                  type: "string",
                  enum: ["Cloud", "Standard"],
                  description: "ABAP version for linting rules. 'Cloud' (default) checks for BTP/Steampunk compatibility.",
                  default: "Cloud"
                }
              },
              required: ["code"]
            }
          }
        ]
      };
    });

    // Handle tool execution
    srv.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const clientMetadata = extractClientMetadata(request);

      if (name === "search") {
        // Extract all parameters with defaults
        const { 
          query,
          k,
          includeOnline = true,  // Online search enabled by default
          includeSamples = true,
          abapFlavor = 'auto',
          sources
        } = args as { 
          query: string;
          k?: number;
          includeOnline?: boolean;
          includeSamples?: boolean;
          abapFlavor?: 'standard' | 'cloud' | 'auto';
          sources?: string[];
        };
        
        // Validate and constrain k parameter (max 100 results)
        const resultCount = Math.min(Math.max(k || CONFIG.RETURN_K, 1), 100);
        
        // Enhanced logging with timing
        const timing = logger.logToolStart(name, query, clientMetadata);
        
        // DEBUG: Log all input parameters
        console.log(`\n🔍 [SEARCH TOOL] ========================================`);
        console.log(`🔍 [SEARCH TOOL] Query: "${query}"`);
        console.log(`🔍 [SEARCH TOOL] Parameters: k=${resultCount}, includeOnline=${includeOnline}, includeSamples=${includeSamples}, abapFlavor=${abapFlavor}`);
        console.log(`🔍 [SEARCH TOOL] Sources filter: ${sources ? sources.join(', ') : 'all'}`);
        console.log(`🔍 [SEARCH TOOL] Request ID: ${timing.requestId}`);
        
        try {
          // Use unified search with all parameters
          console.log(`🔍 [SEARCH TOOL] Calling unified search...`);
          const searchStartTime = Date.now();
          
          const results = await search(query, { 
            k: resultCount,
            includeOnline,
            includeSamples,
            abapFlavor,
            sources
          });
          
          const searchDuration = Date.now() - searchStartTime;
          console.log(`🔍 [SEARCH TOOL] Search completed in ${searchDuration}ms`);
          
          const topResults = results;
          
          // DEBUG: Log result summary
          console.log(`🔍 [SEARCH TOOL] Results returned: ${topResults.length}`);
          if (topResults.length > 0) {
            // Count by sourceKind
            const sourceKindCounts: Record<string, number> = {};
            topResults.forEach(r => {
              const kind = r.sourceKind || 'unknown';
              sourceKindCounts[kind] = (sourceKindCounts[kind] || 0) + 1;
            });
            console.log(`🔍 [SEARCH TOOL] By sourceKind: ${JSON.stringify(sourceKindCounts)}`);
            
            // Log top 3 results for quick inspection
            console.log(`🔍 [SEARCH TOOL] Top 3 results:`);
            topResults.slice(0, 3).forEach((r, i) => {
              console.log(`   ${i+1}. [${r.sourceKind}] score=${r.finalScore?.toFixed(4)} id=${r.id.substring(0, 60)}...`);
            });
          }
          
          if (topResults.length === 0) {
            console.log(`⚠️ [SEARCH TOOL] No results found for query: "${query}"`);
            logger.logToolSuccess(name, timing.requestId, timing.startTime, 0, { fallback: false });
            return createErrorResponse(
              `No results for "${query}". Try ABAP keywords ("SELECT", "LOOP", "RAP"), add "cloud" for ABAP Cloud syntax, or be more specific.`,
              timing.requestId
            );
          }
          
          // Transform results to ChatGPT-compatible format with id, title, url
          const searchResults: SearchResult[] = topResults.map((r, index) => {
            // Extract library_id and topic from document ID
            const libraryIdMatch = r.id.match(/^(\/[^\/]+)/);
            const libraryId = libraryIdMatch ? libraryIdMatch[1] : (r.sourceId ? `/${r.sourceId}` : r.id);
            const topic = r.id.startsWith(libraryId) ? r.id.slice(libraryId.length + 1) : '';
            
            const config = getDocUrlConfig(libraryId);
            const docUrl = config ? generateDocumentationUrl(libraryId, r.relFile || '', r.text, config) : null;
            
            return {
              // ChatGPT-required format: id, title, url
              id: r.id,
              title: r.text.split('\n')[0] || r.id,
              url: docUrl || r.path || `#${r.id}`,
              // Additional fields
              library_id: libraryId,
              topic: topic,
              snippet: r.text ? r.text.substring(0, CONFIG.EXCERPT_LENGTH_MAIN) + '...' : '',
              score: r.finalScore,
              metadata: {
                source: r.sourceId || 'abap-docs',
                sourceKind: r.sourceKind || 'offline',
                library: libraryId,
                bm25Score: r.bm25,
                rank: index + 1
              }
            };
          });
          
          logger.logToolSuccess(name, timing.requestId, timing.startTime, topResults.length, { 
            includeOnline,
            includeSamples,
            abapFlavor
          });
          
          // DEBUG: Log output summary
          console.log(`🔍 [SEARCH TOOL] Returning ${searchResults.length} formatted results`);
          console.log(`🔍 [SEARCH TOOL] ========================================\n`);
          
          return createSearchResponse(searchResults);
        } catch (error) {
          // DEBUG: Log error details
          console.error(`❌ [SEARCH TOOL] Error during search:`, error);
          logger.logToolError(name, timing.requestId, timing.startTime, error, false);
          logger.info('Attempting fallback to original search after unified search failure');
          
          // Fallback to original search (offline only)
          try {
            const res: SearchResponse = await searchLibraries(query);
            
            if (!res.results.length) {
              logger.logToolSuccess(name, timing.requestId, timing.startTime, 0, { fallback: true });
              return createErrorResponse(
                res.error || `No fallback results for "${query}". Try ABAP keywords ("SELECT", "LOOP", "RAP"), add "cloud" for ABAP Cloud syntax, or be more specific.`,
                timing.requestId
              );
            }
            
            // Transform fallback results to structured format
            const fallbackResults: SearchResult[] = res.results.map((r, index) => ({
              id: r.id || `fallback-${index}`,
              title: r.title || 'ABAP Documentation',
              url: r.url || `#${r.id}`,
              snippet: r.description ? r.description.substring(0, 200) + '...' : '',
              metadata: {
                source: 'fallback-search',
                rank: index + 1
              }
            }));
            
            logger.logToolSuccess(name, timing.requestId, timing.startTime, res.results.length, { fallback: true });
            
            return createSearchResponse(fallbackResults);
          } catch (fallbackError) {
            logger.logToolError(name, timing.requestId, timing.startTime, fallbackError, true);
            return createErrorResponse(
              `Search temporarily unavailable. Wait 30 seconds and retry, or use more specific search terms.`,
              timing.requestId
            );
          }
        }
      }

      if (name === "fetch") {
        // Handle both old format (library_id) and new ChatGPT format (id)
        const library_id = (args as any).library_id || (args as any).id;
        const topic = (args as any).topic || "";
        
        if (!library_id) {
          const timing = logger.logToolStart(name, 'missing_id', clientMetadata);
          logger.logToolError(name, timing.requestId, timing.startTime, new Error('Missing id parameter'));
          return createErrorResponse(
            `Missing required parameter: id. Please provide a document ID from search results.`,
            timing.requestId
          );
        }
        
        // Enhanced logging with timing
        const searchKey = library_id + (topic ? `/${topic}` : '');
        const timing = logger.logToolStart(name, searchKey, clientMetadata);
        
        try {
          const text = await fetchLibraryDocumentation(library_id, topic);
          
          if (!text) {
            logger.logToolSuccess(name, timing.requestId, timing.startTime, 0);
            return createErrorResponse(
              `Nothing found for ${library_id}`,
              timing.requestId
            );
          }
          
          // Transform document content to ChatGPT-compatible format
          const config = getDocUrlConfig(library_id);
          const docUrl = config ? generateDocumentationUrl(library_id, '', text, config) : null;
          const document: DocumentResult = {
            id: library_id,
            title: library_id.replace(/^\//, '').replace(/\//g, ' > ') + (topic ? ` (${topic})` : ''),
            text: text,
            url: docUrl || `#${library_id}`,
            metadata: {
              source: 'abap-docs',
              library: library_id,
              topic: topic || undefined,
              contentLength: text.length
            }
          };
          
          logger.logToolSuccess(name, timing.requestId, timing.startTime, 1, { 
            contentLength: text.length,
            libraryId: library_id,
            topic: topic || undefined
          });
          
          return createDocumentResponse(document);
        } catch (error) {
          logger.logToolError(name, timing.requestId, timing.startTime, error);
          return createErrorResponse(
            `Error retrieving documentation for ${library_id}. Please try again later.`,
            timing.requestId
          );
        }
      }

      if (name === "abap_lint") {
        const { code, filename, version } = args as { 
          code: string; 
          filename?: string;
          version?: "Cloud" | "Standard";
        };
        
        if (!code) {
          const timing = logger.logToolStart(name, 'missing_code', clientMetadata);
          logger.logToolError(name, timing.requestId, timing.startTime, new Error('Missing code parameter'));
          return createErrorResponse(
            `Missing required parameter: code. Please provide ABAP source code to lint.`,
            timing.requestId
          );
        }
        
        // Enhanced logging with timing (show first 50 chars of code)
        const codePreview = code.substring(0, 50).replace(/\n/g, ' ') + (code.length > 50 ? '...' : '');
        const timing = logger.logToolStart(name, codePreview, clientMetadata);
        
        try {
          const result: LintResult = await lintAbapCode(code, filename || 'code.abap', version || 'Cloud');
          
          logger.logToolSuccess(name, timing.requestId, timing.startTime, 1, {
            errorCount: result.errorCount,
            warningCount: result.warningCount,
            infoCount: result.infoCount
          });
          
          // Return structured JSON response
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result)
              }
            ]
          };
        } catch (error) {
          logger.logToolError(name, timing.requestId, timing.startTime, error);
          return createErrorResponse(
            `Error running abaplint: ${error}`,
            timing.requestId
          );
        }
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  /**
   * Setup prompt handlers for ABAP/RAP development
   */
  private static setupPromptHandlers(srv: Server): void {
    // List available prompts
    srv.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: "abap_search_help",
            title: "ABAP/RAP Documentation Search Helper",
            description: "Helps users construct effective search queries for ABAP and RAP documentation",
            arguments: [
              {
                name: "topic",
                description: "ABAP topic (RAP, CDS, BOPF, etc.)",
                required: false
              },
              {
                name: "flavor",
                description: "ABAP flavor: standard (on-premise) or cloud (BTP)",
                required: false
              }
            ]
          },
          {
            name: "abap_troubleshoot",
            title: "ABAP Issue Troubleshooting Guide",
            description: "Guides users through troubleshooting common ABAP development issues",
            arguments: [
              {
                name: "error_message",
                description: "Error message or symptom description",
                required: false
              },
              {
                name: "context",
                description: "Development context (RAP, CDS, classic ABAP, etc.)",
                required: false
              }
            ]
          }
        ]
      };
    });

    // Get specific prompt
    srv.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case "abap_search_help":
          const topic = args?.topic || "ABAP";
          const flavor = args?.flavor || "standard";
          
          return {
            description: `Search helper for ${topic} documentation (${flavor})`,
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `I need help searching ${topic} documentation for ${flavor} ABAP. What search terms should I use to find the most relevant results?

Here are some tips for effective ABAP documentation searches:

**For Standard ABAP (on-premise):**
- Use specific ABAP statements: "SELECT", "LOOP", "MODIFY", "READ TABLE"
- Include object types: "class", "method", "interface", "function module"
- Mention specific features: "internal tables", "field symbols", "data references"

**For ABAP Cloud (BTP):**
- Add "cloud" or "btp" to your query to filter for cloud-compatible syntax
- Focus on released APIs and objects
- Use RAP-related terms: "behavior definition", "projection", "unmanaged"

**For RAP (RESTful Application Programming):**
- Use specific RAP terms: "behavior definition", "behavior implementation"
- Include entity types: "root entity", "child entity", "composition"
- Mention actions and determinations: "action", "determination", "validation"

**For CDS (Core Data Services):**
- Use CDS keywords: "define view", "association", "composition"
- Include annotation types: "@UI", "@ObjectModel", "@Consumption"
- Mention specific features: "virtual elements", "calculated fields"

**General Tips:**
- Be specific rather than broad
- Include error codes if troubleshooting
- Use technical ABAP terms
- Combine multiple related terms

What specific ABAP topic are you looking for help with?`
                }
              }
            ]
          };

        case "abap_troubleshoot":
          const errorMessage = args?.error_message || "an issue";
          const context = args?.context || "ABAP";
          
          return {
            description: `Troubleshooting guide for ${context}`,
            messages: [
              {
                role: "user", 
                content: {
                  type: "text",
                  text: `I'm experiencing ${errorMessage} with ${context}. Let me help you troubleshoot this systematically.

**Step 1: Information Gathering**
- What is the exact error message or symptom?
- When does this occur (during development, activation, runtime)?
- Are you using Standard ABAP or ABAP Cloud?
- Is this related to RAP, CDS, or classic ABAP?

**Step 2: Initial Search Strategy**
Let me search the ABAP documentation for similar issues:

**For Syntax Errors:**
- Search for the exact ABAP statement causing issues
- Check if the syntax is cloud-compatible (add "cloud" to query)
- Look for deprecated or changed syntax

**For RAP Issues:**
- Check behavior definition and implementation
- Verify entity relationships and compositions
- Look for action/determination/validation patterns

**For CDS Issues:**
- Verify view definitions and associations
- Check annotation syntax and targets
- Look for authorization and access control issues

**For Runtime Errors:**
- Search for the exact runtime error (e.g., "CX_SY_ZERODIVIDE")
- Check object dependencies
- Verify data types and conversions

**Step 3: Common Solutions**
Based on the issue type, I'll search for:
- Official ABAP keyword documentation
- ABAP Cheat Sheets with examples
- Clean ABAP style guide recommendations
- RAP sample implementations

Please provide more details about your specific issue, and I'll search for relevant solutions.`
                }
              }
            ]
          };

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  /**
   * Initialize metadata system (shared initialization logic)
   */
  static initializeMetadata(): void {
    logger.info('Initializing BM25 search system...');
    try {
      loadMetadata();
      logger.info('Search system ready with metadata');
    } catch (error) {
      logger.warn('Metadata loading failed, using defaults', { error: String(error) });
      logger.info('Search system ready');
    }
  }
}
