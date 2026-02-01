import { search, UnifiedSearchOptions } from '../src/lib/search';
import * as fs from 'fs/promises';
import * as path from 'path';

// Define the test cases - Legacy ABAP development topics
interface TestCase {
  name: string;
  query: string;
  options: UnifiedSearchOptions;
  filename: string;
}

const testCases: TestCase[] = [
  // 21: ALV Grid - classic report development
  {
    name: "ALV Grid REUSE_ALV_GRID_DISPLAY (Standard, Online, Samples)",
    query: "ALV grid REUSE_ALV_GRID_DISPLAY function module",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: true },
    filename: "21_alv_grid_function_standard_online_samples.json"
  },
  // 22: Selection screen parameters
  {
    name: "Selection Screen PARAMETERS SELECT-OPTIONS (Standard, Offline, Samples)",
    query: "PARAMETERS SELECT-OPTIONS selection screen AT SELECTION-SCREEN",
    options: { abapFlavor: 'standard', includeOnline: false, includeSamples: true },
    filename: "22_selection_screen_standard_offline_samples.json"
  },
  // 23: Function module RFC
  {
    name: "RFC Function Module Call (Standard, Online, No Samples)",
    query: "CALL FUNCTION DESTINATION RFC remote function call",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: false },
    filename: "23_rfc_function_module_standard_online_nosamples.json"
  },
  // 24: BAPI usage
  {
    name: "BAPI COMMIT WORK ROLLBACK (Standard, Online, Samples)",
    query: "BAPI BAPI_TRANSACTION_COMMIT BAPI_TRANSACTION_ROLLBACK",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: true },
    filename: "24_bapi_commit_rollback_standard_online_samples.json"
  },
  // 25: Internal table operations
  {
    name: "READ TABLE LOOP AT MODIFY (Standard, Offline, No Samples)",
    query: "READ TABLE WITH KEY LOOP AT WHERE MODIFY TABLE",
    options: { abapFlavor: 'standard', includeOnline: false, includeSamples: false },
    filename: "25_internal_table_operations_standard_offline_nosamples.json"
  },
  // 26: Smartforms
  {
    name: "Smartforms SSF_FUNCTION_MODULE_NAME (Standard, Online, Samples)",
    query: "Smartforms SSF_FUNCTION_MODULE_NAME print output",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: true },
    filename: "26_smartforms_standard_online_samples.json"
  },
  // 27: Debugging BREAK-POINT
  {
    name: "ABAP Debugger BREAK-POINT ASSERT (Standard, Offline, Samples)",
    query: "BREAK-POINT ASSERT debugging watchpoint",
    options: { abapFlavor: 'standard', includeOnline: false, includeSamples: true },
    filename: "27_debugging_breakpoint_standard_offline_samples.json"
  },
  // 28: Database operations with FOR ALL ENTRIES
  {
    name: "FOR ALL ENTRIES SELECT Performance (Standard, Online, No Samples)",
    query: "FOR ALL ENTRIES IN SELECT performance optimization",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: false },
    filename: "28_for_all_entries_standard_online_nosamples.json"
  },
  // 29: Batch job scheduling
  {
    name: "Background Job JOB_OPEN JOB_SUBMIT (Standard, Online, Samples)",
    query: "JOB_OPEN JOB_SUBMIT JOB_CLOSE background job scheduling",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: true },
    filename: "29_batch_job_standard_online_samples.json"
  },
  // 30: Module pool dynpro
  {
    name: "Dynpro Module Pool PBO PAI (Standard, Offline, No Samples)",
    query: "MODULE POOL dynpro PBO PAI screen painter",
    options: { abapFlavor: 'standard', includeOnline: false, includeSamples: false },
    filename: "30_dynpro_module_pool_standard_offline_nosamples.json"
  }
];

async function run() {
  console.log("Starting search result generation (Scenarios 21-30 - Legacy ABAP)...");
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
