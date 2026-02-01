# Search Results Analysis 2 - Specific Query Testing (Scenarios 11-20)

This document analyzes 10 additional search scenarios using more specific technical queries to identify relevance and ranking issues.

## Executive Summary

The parameter filtering (samples, online, flavor) continues to work correctly. However, **significant relevance issues** were identified:

| Category | Status | Description |
|----------|--------|-------------|
| Sample Filtering | ✅ PASS | Correctly excludes sample repos when disabled |
| Online Filtering | ✅ PASS | Correctly excludes online sources when disabled |
| Language Filtering | ✅ PASS | No CleanABAP_de/ja/kr found |
| **Relevance** | ❌ FAIL | Major issues with 5 of 10 queries |

### Overall Relevance Scores

| Scenario | Query | Score | Status |
|----------|-------|-------|--------|
| 11 | SELECT SINGLE INTO DATA | 3.0/5 | ⚠️ WARN |
| 12 | TABLE types comparison | 3.2/5 | ⚠️ WARN |
| 13 | TRY CATCH CLEANUP | **4.6/5** | ✅ PASS |
| 14 | BDEF determination | 3.5/5 | ⚠️ WARN |
| 15 | @UI.lineItem annotation | **2.1/5** | ❌ FAIL |
| 16 | SQL trace ST05 | 3.0/5 | ⚠️ WARN |
| 17 | Steampunk BTP | 4.0/5 | ⚠️ WARN |
| 18 | RAP action parameters | **4.5/5** | ✅ PASS |
| 19 | AMDP SQLScript | **5.0/5** | ✅ PASS |
| 20 | Clean code naming | **2.0/5** | ❌ FAIL |

---

## Critical Issues Identified

### Issue 1: SAP Help Returns Non-ABAP Content (HIGH SEVERITY)

**Affected Scenarios**: 11, 12, 16, 20

When `includeOnline: true`, SAP Help search returns results from completely unrelated SAP products that happen to match query keywords:

| Query | Irrelevant SAP Help Results |
|-------|----------------------------|
| "SELECT SINGLE INTO DATA" | SAP Identity Management, Data Lake SSO, SAP Data Services |
| "TABLE vs" | SAP BI Content (Profit Summation, Contribution Margin), BusinessObjects |
| "SQL trace ST05" | SAP BI Content, CDS DCL conditions |
| "clean code naming" | BI "Cleaning Objects", BOR Programming Guide |

**Root Cause**: Word-based matching without semantic filtering. Terms like "SELECT", "TABLE", "DATA", "clean" match across all SAP product documentation.

### Issue 2: CleanABAP Style Guide Ranked Too Low (HIGH SEVERITY)

**Affected Scenarios**: 20

For the query "clean code naming conventions variables methods":
- **Expected**: CleanABAP style guide at rank #1
- **Actual**: CleanABAP at rank #37 (with boost of only 0.6)

The CleanABAP style guide is THE authoritative source for ABAP clean code practices but is being outranked by:
- Generic ABAP documentation
- Completely irrelevant "Cleaning Object" BI content
- Old BOR programming guides

### Issue 3: Core Documentation Outranked by News/Examples (MEDIUM SEVERITY)

**Affected Scenarios**: 14, 15, 17

The main reference documentation is outranked by secondary content:

| Query | Core Doc | Actual Rank | Outranked By |
|-------|----------|-------------|--------------|
| BDEF determination | `ABENBDL_DETERMINATIONS` | #7 | News articles, extensibility docs |
| @UI.lineItem | Annotation documentation | #22+ | Calculator examples, TOC pages |
| Steampunk | `ABENSTEAMPUNK_GLOSRY` | #3 | ABAP documentation config news |

### Issue 4: Glossary Entries Ranking Issues (LOW SEVERITY)

**Affected Scenarios**: 12, 16

Glossary entries (`_GLOSRY`) sometimes rank higher than detailed documentation, but sometimes the detailed documentation should rank higher for "how to" queries.

---

## Detailed Findings by Scenario

### Scenario 11: SELECT SINGLE INTO DATA

**Score: 3.0/5**

**Good**:
- Rank #1 `ABAPSELECT_SINGLE` is perfect
- Rank #3 `ABAPSELECT_INTO_TARGET` covers INTO DATA() syntax

**Bad**:
- Ranks #16-21 are SAP Help results about non-ABAP topics (Identity Management, Data Services)
- Community result about S/4HANA migrations (irrelevant)

### Scenario 12: TABLE Types Comparison

**Score: 3.2/5**

**Good**:
- Rank #2 `ABENSELECT_TABLE_TYPE_GUIDL` is the ideal result

**Bad**:
- Best result is at rank #2, not #1
- SAP Help returns BI content (Operating Profit, Contribution Margin tables)

### Scenario 13: TRY CATCH CLEANUP (EXCELLENT)

**Score: 4.6/5**

All top 10 results are directly relevant:
1. `ABAPCATCH_TRY` - CATCH documentation
2. `ABAPCLEANUP` - CLEANUP documentation
3. `ABAPTRY` - TRY documentation
4. Cheat sheet content appropriately included

**This is the model for good search results.**

### Scenario 14: BDEF Determination

**Score: 3.5/5**

**Critical Issue**: `ABENBDL_DETERMINATIONS` (the core documentation) is at rank #7 instead of #1.

News articles (`ABENNEWS-756`, `ABENNEWS-782`) are outranking the reference documentation.

### Scenario 15: @UI.lineItem Annotation (POOR)

**Score: 2.1/5**

**Critical Issues**:
- Rank #1 is a RAP calculator example (irrelevant)
- Actual annotation documentation is at ranks #22-27
- TOC pages taking up result slots without value

### Scenario 16: SQL Trace ST05

**Score: 3.0/5**

- Only 4 of top 10 results are about SQL tracing
- Many results match "SQL" but not "trace/ST05"
- Transaction code not being properly recognized

### Scenario 17: Steampunk BTP

**Score: 4.0/5**

**Issue**: Top 2 results are about ABAP documentation config, not Steampunk.
- `ABENSTEAMPUNK_GLOSRY` should be rank #1 but is at #3

### Scenario 18: RAP Action Parameters (EXCELLENT)

**Score: 4.5/5**

Very good results - most directly relevant to RAP action implementation.

### Scenario 19: AMDP SQLScript (EXCELLENT)

**Score: 5.0/5**

Best results of all 10 scenarios. All top 10 directly about AMDP, SQLScript, or CDS table functions.

### Scenario 20: Clean Code Naming (POOR)

**Score: 2.0/5**

**Critical Issues**:
- CleanABAP style guide is at rank #37 (should be #1)
- "clean" keyword matches BI "Cleaning Objects"
- Best practice content completely buried

---

## Root Cause Analysis

### 1. SAP Help Search Quality
The online SAP Help search returns results across ALL SAP products without filtering to ABAP context. This pollutes results when common words appear in non-ABAP documentation.

### 2. Style Guide Boost Insufficient
Current boost for `sap-styleguides` source is too low (0.6 observed). For clean code/best practice queries, this should be much higher.

### 3. News Articles Over-Boosted
`ABENNEWS-*` articles are ranking too high, outranking core reference documentation.

### 4. Title/Exact Match Boosting Insufficient
Queries with specific technical terms (e.g., "@UI.lineItem", "ST05", "Steampunk") don't boost documents with exact title matches enough.

### 5. No Domain Filtering for Online Sources
When "ABAP" is in the query, online results should be filtered to ABAP-related content only.

---

## Recommendations for Fixes

### Priority 1: Critical Fixes

1. **Boost CleanABAP for clean code queries**
   - Detect "clean code", "naming convention", "best practice" in query
   - Apply significant boost (+2.0 or higher) to `sap-styleguides` source

2. **Filter irrelevant SAP Help results**
   - When query contains "ABAP", filter SAP Help results to ABAP-related products
   - Or: down-rank SAP Help results that don't mention "ABAP" in their content

3. **Down-rank news articles for core concept queries**
   - `ABENNEWS-*` should have a penalty (-0.5) unless query mentions "news" or "release"

### Priority 2: Medium Fixes

4. **Boost core documentation over examples**
   - Documents like `ABENBDL_DETERMINATIONS` should rank higher than extensibility/example docs
   - Consider detecting "how to" vs "reference" intent

5. **Improve exact term matching**
   - Transaction codes (ST05, SE80) should boost matching docs significantly
   - Annotation syntax (@UI.lineItem) should boost annotation reference docs

### Priority 3: Future Improvements

6. **Semantic filtering for online sources**
   - Classify SAP Help results by product area
   - Filter to ABAP/S4HANA when query is ABAP-related

7. **Query intent classification**
   - "vs" / "comparison" queries → boost comparison content
   - "best practice" / "clean" queries → boost style guides
   - "how to" / "example" queries → boost samples and tutorials

---

## Test Data Files

| File | Query | Options |
|------|-------|---------|
| `11_select_single_standard_online_samples.json` | SELECT SINGLE INTO DATA | standard, online, samples |
| `12_table_types_comparison_standard_online_nosamples.json` | STANDARD TABLE vs SORTED TABLE vs HASHED TABLE | standard, online, no samples |
| `13_try_catch_cloud_offline_samples.json` | TRY CATCH CLEANUP exception handling | cloud, offline, samples |
| `14_bdef_determination_cloud_online_nosamples.json` | BDEF determination on modify | cloud, online, no samples |
| `15_ui_lineitem_annotation_cloud_offline_samples.json` | @UI.lineItem position importance | cloud, offline, samples |
| `16_sql_trace_standard_online_nosamples.json` | SQL trace ST05 performance analysis | standard, online, no samples |
| `17_steampunk_cloud_online_samples.json` | Steampunk ABAP Environment BTP | cloud, online, samples |
| `18_rap_action_parameters_cloud_offline_nosamples.json` | RAP action with importing parameters result | cloud, offline, no samples |
| `19_amdp_sqlscript_standard_online_samples.json` | AMDP SQLScript CDS table function | standard, online, samples |
| `20_clean_code_naming_auto_online_nosamples.json` | clean code naming conventions variables methods | auto, online, no samples |
