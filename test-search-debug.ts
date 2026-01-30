#!/usr/bin/env npx ts-node
/**
 * Debug test script for search functionality
 * Tests the search tool with various queries to verify it works correctly
 */
import { search } from "./src/lib/search.js";
import { loadMetadata } from "./src/lib/metadata.js";

async function runTests() {
  console.log("=".repeat(80));
  console.log("SEARCH TOOL DEBUG TEST");
  console.log("=".repeat(80));
  
  // Load metadata first
  console.log("\n📋 Loading metadata...");
  loadMetadata();
  
  // Test cases
  const testCases = [
    { 
      name: "Basic RAP query", 
      query: "RAP behavior definition",
      options: { k: 5 }
    },
    {
      name: "ABAP identifier query",
      query: "GET_GLOBAL_AUTHORIZATIONS",
      options: { k: 5 }
    },
    {
      name: "RAP + identifier query",
      query: "rap GET_GLOBAL_AUTHORIZATIONS",
      options: { k: 10 }
    },
    {
      name: "CDS annotation query",
      query: "@UI.lineItem annotation",
      options: { k: 5 }
    },
    {
      name: "Online search test (k=5)",
      query: "RAP authorization",
      options: { k: 5, includeOnline: true }
    },
    {
      name: "Online search test (k=20) - should show online results",
      query: "RAP authorization",
      options: { k: 20, includeOnline: true }
    }
  ];
  
  for (const testCase of testCases) {
    console.log("\n" + "=".repeat(80));
    console.log(`TEST: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    console.log(`Options: ${JSON.stringify(testCase.options)}`);
    console.log("-".repeat(80));
    
    const startTime = Date.now();
    try {
      const results = await search(testCase.query, testCase.options);
      const duration = Date.now() - startTime;
      
      console.log(`\n✅ Results: ${results.length} in ${duration}ms`);
      
      // Count by sourceKind
      const sourceKindCounts: Record<string, number> = {};
      results.forEach(r => {
        const kind = r.sourceKind || 'unknown';
        sourceKindCounts[kind] = (sourceKindCounts[kind] || 0) + 1;
      });
      console.log(`   By sourceKind: ${JSON.stringify(sourceKindCounts)}`);
      
      // Show results
      results.forEach((r, i) => {
        const title = r.text.split('\n')[0]?.substring(0, 50) || r.id;
        console.log(`   ${i+1}. [${r.sourceKind}] score=${r.finalScore?.toFixed(4)} "${title}..."`);
        if (r.debug) {
          console.log(`      debug: rank=${r.debug.rank}, rrf=${r.debug.rrfScore?.toFixed(5)}, boost=${r.debug.boost?.toFixed(2)}`);
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`\n❌ ERROR after ${duration}ms:`, error);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("TEST COMPLETE");
  console.log("=".repeat(80));
}

runTests().catch(console.error);
