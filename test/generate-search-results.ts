
import { search, UnifiedSearchOptions } from '../src/lib/search';
import * as fs from 'fs/promises';
import * as path from 'path';

// Define the test cases
interface TestCase {
  name: string;
  query: string;
  options: UnifiedSearchOptions;
  filename: string;
}

const testCases: TestCase[] = [
  {
    name: "RAP (Standard, Online, Samples)",
    query: "RAP managed business object",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: true },
    filename: "1_rap_standard_online_samples.json"
  },
  {
    name: "RAP (Cloud, Offline, No Samples)",
    query: "RAP managed business object",
    options: { abapFlavor: 'cloud', includeOnline: false, includeSamples: false },
    filename: "2_rap_cloud_offline_nosamples.json"
  },
  {
    name: "Classes (Standard, Online, Samples)",
    query: "ABAP class inheritance",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: true },
    filename: "3_classes_standard_online_samples.json"
  },
  {
    name: "Classes (Standard, Offline, No Samples)",
    query: "ABAP class inheritance",
    options: { abapFlavor: 'standard', includeOnline: false, includeSamples: false },
    filename: "4_classes_standard_offline_nosamples.json"
  },
  {
    name: "Fiori Elements (Cloud, Online, Samples)",
    query: "Fiori Elements List Report",
    options: { abapFlavor: 'cloud', includeOnline: true, includeSamples: true },
    filename: "5_fiori_cloud_online_samples.json"
  },
  {
    name: "Fiori Elements (Standard, Offline, No Samples)",
    query: "Fiori Elements List Report",
    options: { abapFlavor: 'standard', includeOnline: false, includeSamples: false },
    filename: "6_fiori_standard_offline_nosamples.json"
  },
  {
    name: "RETURN vs EXPORT (Auto, Online, No Samples)",
    query: "ABAP method return vs exporting",
    options: { abapFlavor: 'auto', includeOnline: true, includeSamples: false },
    filename: "7_return_export_auto_online_nosamples.json"
  },
  {
    name: "Report (Standard, Online, Samples)",
    query: "ABAP ALV report",
    options: { abapFlavor: 'standard', includeOnline: true, includeSamples: true },
    filename: "8_report_standard_online_samples.json"
  },
  {
    name: "RAP Unmanaged (Cloud, Online, Samples)",
    query: "RAP unmanaged save",
    options: { abapFlavor: 'cloud', includeOnline: true, includeSamples: true },
    filename: "9_rap_unmanaged_cloud_online_samples.json"
  },
  {
    name: "CDS (Cloud, Online, No Samples)",
    query: "CDS view parameters",
    options: { abapFlavor: 'cloud', includeOnline: true, includeSamples: false },
    filename: "10_cds_cloud_online_nosamples.json"
  }
];

async function run() {
  console.log("Starting search result generation...");
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
