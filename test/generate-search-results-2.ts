import { search, UnifiedSearchOptions } from '../src/lib/search';
import * as fs from 'fs/promises';
import * as path from 'path';

// Define the test cases - More specific/edge case queries
interface TestCase {
  name: string;
  query: string;
  options: UnifiedSearchOptions;
  filename: string;
}

const testCases: TestCase[] = [
  // 11: Very specific ABAP statement - test exact term matching
  {
    name: "SELECT SINGLE (Standard, Online, Samples)",
    query: "SELECT SINGLE INTO DATA",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: true },
    filename: "11_select_single_standard_online_samples.json"
  },
  // 12: Comparison query - test "vs" intent detection
  {
    name: "Internal Table Types Comparison (Standard, Online, No Samples)",
    query: "STANDARD TABLE vs SORTED TABLE vs HASHED TABLE",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: false },
    filename: "12_table_types_comparison_standard_online_nosamples.json"
  },
  // 13: Error handling - specific programming concept
  {
    name: "TRY CATCH Exception Handling (Cloud, Offline, Samples)",
    query: "TRY CATCH CLEANUP exception handling",
    options: { abapFlavor: 'cloud', includeOnline: false, includeSamples: true },
    filename: "13_try_catch_cloud_offline_samples.json"
  },
  // 14: RAP very specific - behavior definition syntax
  {
    name: "BDEF Determination (Cloud, Online, No Samples)",
    query: "BDEF determination on modify",
    options: { abapFlavor: 'cloud', includeOnline: true, includeSamples: false },
    filename: "14_bdef_determination_cloud_online_nosamples.json"
  },
  // 15: CDS Annotation - very specific syntax
  {
    name: "@UI.lineItem Annotation (Cloud, Offline, Samples)",
    query: "@UI.lineItem position importance",
    options: { abapFlavor: 'cloud', includeOnline: false, includeSamples: true },
    filename: "15_ui_lineitem_annotation_cloud_offline_samples.json"
  },
  // 16: Debugging/Performance - practical query
  {
    name: "SQL Trace ST05 (Standard, Online, No Samples)",
    query: "SQL trace ST05 performance analysis",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: false },
    filename: "16_sql_trace_standard_online_nosamples.json"
  },
  // 17: BTP-specific term - test cloud detection
  {
    name: "Steampunk ABAP Environment (Cloud, Online, Samples)",
    query: "Steampunk ABAP Environment BTP",
    options: { abapFlavor: 'cloud', includeOnline: true, includeSamples: true },
    filename: "17_steampunk_cloud_online_samples.json"
  },
  // 18: RAP Action with parameters - specific syntax
  {
    name: "RAP Action with Parameters (Cloud, Offline, No Samples)",
    query: "RAP action with importing parameters result",
    options: { abapFlavor: 'cloud', includeOnline: false, includeSamples: false },
    filename: "18_rap_action_parameters_cloud_offline_nosamples.json"
  },
  // 19: AMDP - Advanced topic
  {
    name: "AMDP SQLScript (Standard, Online, Samples)",
    query: "AMDP SQLScript CDS table function",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: true },
    filename: "19_amdp_sqlscript_standard_online_samples.json"
  },
  // 20: Clean Code best practices - style guide query
  {
    name: "Clean ABAP Naming Conventions (Auto, Online, No Samples)",
    query: "clean code naming conventions variables methods",
    options: { abapFlavor: 'auto', includeOnline: true, includeSamples: false },
    filename: "20_clean_code_naming_auto_online_nosamples.json"
  }
];

async function run() {
  console.log("Starting search result generation (Scenarios 11-20)...");
  const resultsDir = path.join(process.cwd(), 'test', 'results');

  for (const testCase of testCases) {
    console.log(`Running: ${testCase.name}`);
    try {
      const results = await search(testCase.query, testCase.options);
      
      const output = {
        meta: {
          query: testCase.query,
          options: testCase.options,
          timestamp: new Date().toISOString(),
          count: results.length
        },
        results: results
      };

      await fs.writeFile(
        path.join(resultsDir, testCase.filename),
        JSON.stringify(output, null, 2)
      );
      console.log(`  Saved ${results.length} results to ${testCase.filename}`);
    } catch (error) {
      console.error(`  Error running ${testCase.name}:`, error);
    }
  }
  console.log("Done.");
}

run();
