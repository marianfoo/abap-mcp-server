// PM2 configuration for ABAP MCP server
// Modern MCP streamable HTTP transport only (SSE proxy removed)
module.exports = {
  apps: [
    // HTTP status server on :3002 (pinned port for PM2)
    {
      name: "abap-mcp-http",
      script: "node",
      args: ["/opt/mcp-sap/abap-mcp-server/dist/src/http-server.js"],
      cwd: "/opt/mcp-sap/abap-mcp-server",
      env: { 
        NODE_ENV: "production", 
        PORT: "3002",
        LOG_LEVEL: "DEBUG",  // Enhanced for debugging
        LOG_FORMAT: "json",
        // BM25-only search configuration
        RETURN_K: "30"  // Centralized result limit (can override CONFIG.RETURN_K)
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      // Enhanced logging configuration
      log_file: "/opt/mcp-sap/logs/abap-mcp-http-combined.log",
      out_file: "/opt/mcp-sap/logs/abap-mcp-http-out.log",
      error_file: "/opt/mcp-sap/logs/abap-mcp-http-error.log",
      log_type: "json",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Log rotation
      max_size: "10M",
      retain: 10,
      compress: true
    },

    // Streamable HTTP MCP server (latest MCP spec)
    {
      name: "abap-mcp-streamable",
      script: "node",
      args: ["/opt/mcp-sap/abap-mcp-server/dist/src/streamable-http-server.js"],
      cwd: "/opt/mcp-sap/abap-mcp-server",
      env: { 
        NODE_ENV: "production", 
        MCP_PORT: "3124",
        LOG_LEVEL: "DEBUG",  // Enhanced for debugging
        LOG_FORMAT: "json",
        // BM25-only search configuration
        RETURN_K: "30"  // Centralized result limit (can override CONFIG.RETURN_K)
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      // Enhanced logging configuration
      log_file: "/opt/mcp-sap/logs/abap-mcp-streamable-combined.log",
      out_file: "/opt/mcp-sap/logs/abap-mcp-streamable-out.log",
      error_file: "/opt/mcp-sap/logs/abap-mcp-streamable-error.log",
      log_type: "json",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Log rotation
      max_size: "10M",
      retain: 10,
      compress: true
    }
  ]
}