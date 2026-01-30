// Build pipeline step 2: Compiles dist/data/index.json into dist/data/docs.sqlite/FTS5 for fast search
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

type Doc = {
  id: string;
  relFile: string;
  title: string;
  description: string;
  snippetCount: number;
  type?: string;
  controlName?: string;
  namespace?: string;
  keywords?: string[];
  properties?: string[];
  events?: string[];
  aggregations?: string[];
};

type LibraryBundle = {
  id: string;          // "/sapui5" | "/cap" | "/openui5-api" | "/openui5-samples" | "/wdi5"
  name: string;
  description: string;
  docs: Doc[];
};

const DATA_DIR = path.join(process.cwd(), "dist", "data");
const SRC = path.join(DATA_DIR, "index.json");
const DST = path.join(DATA_DIR, "docs.sqlite");

// Maximum content to index (16KB) - includes method identifiers, annotations, etc.
const MAX_CONTENT_LENGTH = 16 * 1024;

// Mapping from library ID to source directory
// This must match the SOURCES array in build-index.ts
const SOURCE_PATHS: Record<string, string> = {
  "/abap-docs-standard": "sources/abap-docs/docs/standard/md",
  "/abap-docs-cloud": "sources/abap-docs/docs/cloud/md",
  "/abap-cheat-sheets": "sources/abap-cheat-sheets",
  "/sap-styleguides": "sources/sap-styleguides",
  "/dsag-abap-leitfaden": "sources/dsag-abap-leitfaden/docs",
  "/abap-fiori-showcase": "sources/abap-fiori-showcase",
  "/abap-platform-rap-opensap": "sources/abap-platform-rap-opensap",
  "/cloud-abap-rap": "sources/cloud-abap-rap",
  "/abap-platform-reuse-services": "sources/abap-platform-reuse-services"
};

/**
 * Read document content from source file
 * Returns first MAX_CONTENT_LENGTH characters, with ABAP identifiers preserved
 */
function readDocContent(libraryId: string, relFile: string): string {
  const sourcePath = SOURCE_PATHS[libraryId];
  if (!sourcePath) {
    return ""; // Unknown library
  }
  
  const absPath = path.join(process.cwd(), sourcePath, relFile);
  
  try {
    if (!fs.existsSync(absPath)) {
      // For section documents, try the parent file
      const mdFile = relFile.replace(/#.*$/, '') + '.md';
      const parentPath = path.join(process.cwd(), sourcePath, mdFile);
      if (fs.existsSync(parentPath)) {
        const content = fs.readFileSync(parentPath, "utf8");
        return content.substring(0, MAX_CONTENT_LENGTH);
      }
      return "";
    }
    
    const content = fs.readFileSync(absPath, "utf8");
    return content.substring(0, MAX_CONTENT_LENGTH);
  } catch (error) {
    // Silently ignore read errors (file might not exist for section docs)
    return "";
  }
}

/**
 * Extract ABAP identifiers from content for better searchability
 * This captures method names, interface names, annotation qualifiers, etc.
 */
function extractAbapIdentifiers(content: string): string {
  const identifiers = new Set<string>();
  
  // Extract SNAKE_CASE identifiers (ABAP method names like GET_GLOBAL_AUTHORIZATIONS)
  const snakeCaseMatches = content.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g);
  if (snakeCaseMatches) {
    snakeCaseMatches.forEach(m => identifiers.add(m));
  }
  
  // Extract interface/class names with namespace prefixes (e.g., IF_ABAP_BEHV, /IWBEP/IF_MGW)
  const interfaceMatches = content.match(/\b(?:IF|CL|LIF|LCL|ZIF|ZCL)_[A-Z0-9_]+\b/g);
  if (interfaceMatches) {
    interfaceMatches.forEach(m => identifiers.add(m));
  }
  
  // Extract namespace paths (e.g., /IWBEP/IF_MGW_APPL_SRV_RUNTIME)
  const namespaceMatches = content.match(/\/[A-Z0-9]+\/[A-Z0-9_]+/g);
  if (namespaceMatches) {
    namespaceMatches.forEach(m => identifiers.add(m));
  }
  
  // Extract method call patterns (e.g., if_abap_behv=>mk-on)
  const methodCallMatches = content.match(/\b\w+=>\w+(?:-\w+)?/g);
  if (methodCallMatches) {
    methodCallMatches.forEach(m => identifiers.add(m));
  }
  
  // Extract annotation patterns (e.g., @UI.lineItem, @ObjectModel.query)
  const annotationMatches = content.match(/@[A-Z]\w+(?:\.[A-Za-z]+)+/gi);
  if (annotationMatches) {
    annotationMatches.forEach(m => identifiers.add(m));
  }
  
  return Array.from(identifiers).join(' ');
}

function libFromId(id: string): string {
  // id looks like "/sapui5/..." etc.
  const m = id.match(/^\/[^/]+/);
  return m ? m[0] : "";
}

function safeText(x: unknown): string {
  if (!x) return "";
  if (Array.isArray(x)) return x.join(" ");
  return String(x);
}

function main() {
  if (!fs.existsSync(SRC)) {
    throw new Error(`Missing ${SRC}. Run npm run build:index first.`);
  }
  
  console.log(`📖 Reading index from ${SRC}...`);
  const raw = JSON.parse(fs.readFileSync(SRC, "utf8")) as Record<string, LibraryBundle>;

  // Fresh DB
  if (fs.existsSync(DST)) {
    console.log(`🗑️  Removing existing ${DST}...`);
    fs.unlinkSync(DST);
  }
  
  console.log(`🏗️  Creating FTS5 database at ${DST}...`);
  const db = new Database(DST);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("temp_store = MEMORY");

  // FTS5 schema: columns you want to search get indexed; metadata can be UNINDEXED
  // We keep this simple - FTS is just for fast candidate filtering
  // 
  // CRITICAL: The tokenize clause preserves ABAP identifiers:
  // - '_' for snake_case identifiers like GET_GLOBAL_AUTHORIZATIONS
  // - '/' for namespace paths like /IWBEP/IF_MGW_APPL_SRV_RUNTIME
  // - '@' for annotations like @UI.lineItem
  // - '.' for qualified names like sap.m.Button
  // 
  // The 'content' column indexes the first 16KB of document body, allowing
  // searches for method names, interface names, and other identifiers that
  // may not appear in the title/description.
  // 
  // The 'identifiers' column contains extracted ABAP-specific identifiers
  // (method names, interface names, annotations) for high-precision matching.
  // 
  // Note: In FTS5 tokenize strings, nested quotes must be doubled for escaping
  db.exec(`
    CREATE VIRTUAL TABLE docs USING fts5(
      libraryId,                  -- indexed for filtering
      type,                       -- markdown/jsdoc/sample (indexed for filtering)
      title,                      -- strong signal for search
      description,                -- weaker signal for search
      keywords,                   -- control tags and properties
      controlName,                -- e.g., Wizard, Button
      namespace,                  -- e.g., sap.m, sap.f
      content,                    -- first 16KB of document body (indexed)
      identifiers,                -- extracted ABAP identifiers for precision matching
      id UNINDEXED,               -- metadata (full path id)
      relFile UNINDEXED,          -- metadata
      snippetCount UNINDEXED,     -- metadata
      tokenize = "unicode61 remove_diacritics 2 tokenchars '_/.@'"
    );
  `);

  console.log(`📝 Inserting documents into FTS5 index...`);
  const ins = db.prepare(`
    INSERT INTO docs (libraryId,type,title,description,keywords,controlName,namespace,content,identifiers,id,relFile,snippetCount)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  let totalDocs = 0;
  let contentIndexed = 0;
  const tx = db.transaction(() => {
    for (const lib of Object.values(raw)) {
      for (const d of lib.docs) {
        const libraryId = libFromId(d.id);
        const keywords = safeText(d.keywords);
        const props = safeText(d.properties);
        const events = safeText(d.events);
        const aggs = safeText(d.aggregations);
        
        // Combine all searchable keywords
        const keywordsAll = [keywords, props, events, aggs].filter(Boolean).join(" ");
        
        // Read document content from source file (first 16KB)
        const content = readDocContent(libraryId, d.relFile);
        if (content) {
          contentIndexed++;
        }
        
        // Extract ABAP identifiers for precision matching
        const identifiers = extractAbapIdentifiers(content);

        ins.run(
          libraryId,
          d.type ?? "",
          safeText(d.title),
          safeText(d.description),
          keywordsAll,
          safeText(d.controlName),
          safeText(d.namespace),
          content,
          identifiers,
          d.id,
          d.relFile,
          d.snippetCount ?? 0
        );
        totalDocs++;
      }
    }
  });

  tx();
  
  console.log(`📊 Optimizing FTS5 index...`);
  db.pragma("optimize");
  
  // Get some stats
  const rowCount = db.prepare("SELECT count(*) as n FROM docs").get() as { n: number };
  
  db.close();

  console.log(`✅ FTS5 index built successfully!`);
  console.log(`   📄 Documents indexed: ${totalDocs}`);
  console.log(`   📄 Documents with content: ${contentIndexed}`);
  console.log(`   📄 Rows in FTS table: ${rowCount.n}`);
  console.log(`   💾 Database size: ${(fs.statSync(DST).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   📍 Location: ${DST}`);
}

// ES module equivalent of require.main === module
import { fileURLToPath } from 'url';
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error("❌ Error building FTS index:", error);
    process.exit(1);
  }
}