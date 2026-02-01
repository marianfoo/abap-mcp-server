# Search Relevance Fix Plan

Based on the analysis in ANALYSIS_2.md, here is the implementation plan to fix the identified issues.

## Priority 1: Critical Fixes

### Fix 1.1: Boost CleanABAP for Style/Best Practice Queries

**File**: `src/lib/search.ts`

**Implementation**:
```typescript
// Add to query intent detection
function hasCleanCodeIntent(query: string): boolean {
  return /\b(clean\s*code|naming\s*convention|best\s*practice|style\s*guide|coding\s*standard)\b/i.test(query);
}

// In the boost calculation section, add:
if (hasCleanCodeIntent(query) && sourceId === 'sap-styleguides') {
  boost += 3.0; // Significant boost for style guide on clean code queries
}
```

**Expected Impact**: CleanABAP will rank #1-3 for clean code queries instead of #37.

---

### Fix 1.2: Down-rank News Articles for Core Concept Queries

**File**: `src/lib/search.ts`

**Implementation**:
```typescript
// Add penalty for news articles when query is about core concepts
function hasNewsIntent(query: string): boolean {
  return /\b(news|release|update|new\s*in|what'?s\s*new)\b/i.test(query);
}

// In boost calculation:
if (r.id && r.id.includes('ABENNEWS-') && !hasNewsIntent(query)) {
  boost -= 0.8; // Penalty for news articles on non-news queries
}
```

**Expected Impact**: `ABENBDL_DETERMINATIONS` will outrank `ABENNEWS-*` for "BDEF determination" queries.

---

### Fix 1.3: Filter/Down-rank Non-ABAP SAP Help Results

**File**: `src/lib/search.ts`

**Implementation**:
```typescript
// When processing SAP Help results, check for ABAP relevance
const abapTerms = /\b(abap|rap|cds|bdef|fiori\s*elements|s\/4|sap\s*hana)\b/i;

// In helpResults mapping:
const helpResults = helpResponse.results.slice(0, 10).map((r, idx) => {
  let relevanceBoost = onlineBoost;
  
  // Down-rank SAP Help results that don't mention ABAP-related terms
  const content = `${r.title} ${r.snippet || ''}`.toLowerCase();
  if (!abapTerms.test(content)) {
    relevanceBoost -= 1.0; // Penalty for non-ABAP content
  }
  
  // ...rest of mapping
});
```

**Expected Impact**: BI Content, Data Lake, Identity Management results will rank lower.

---

## Priority 2: Medium Fixes

### Fix 2.1: Boost Core Documentation Over Examples

**File**: `src/lib/search.ts`

**Implementation**:
```typescript
// Identify core reference documentation patterns
const coreDocPatterns = [
  /^ABEN[A-Z]+$/, // Core glossary entries without suffix
  /^ABAP[A-Z_]+$/, // Core ABAP syntax docs
  /^ABENBDL_[A-Z]+$/, // Core BDL syntax (not examples)
  /^ABENCDS_[A-Z_]+_V\d$/, // Core CDS syntax
];

// Penalize example documents when query doesn't indicate example intent
const isExampleDoc = r.id && (r.id.includes('_ABEXA') || r.id.includes('_EXAMPLE'));
if (isExampleDoc && !hasImplementationIntent(query)) {
  boost -= 0.3;
}

// Boost core docs
for (const pattern of coreDocPatterns) {
  if (pattern.test(r.id)) {
    boost += 0.3;
    break;
  }
}
```

**Expected Impact**: `ABENBDL_DETERMINATIONS` ranks higher than extensibility examples.

---

### Fix 2.2: Transaction Code Recognition

**File**: `src/lib/search.ts`

**Implementation**:
```typescript
// Extract transaction codes from query
function extractTransactionCodes(query: string): string[] {
  const matches = query.match(/\b(S[ET]\d{2}|SM\d{2}|ST\d{2}|SE\d{2})\b/gi);
  return matches || [];
}

// In boost calculation, if query contains transaction codes:
const tcodes = extractTransactionCodes(query);
if (tcodes.length > 0) {
  const title = (r.title || '').toUpperCase();
  for (const tcode of tcodes) {
    if (title.includes(tcode.toUpperCase()) || (r.id || '').toUpperCase().includes(tcode.toUpperCase())) {
      boost += 1.0; // Strong boost for transaction code matches
    }
  }
}
```

**Expected Impact**: ST05-specific documentation ranks higher for "SQL trace ST05" queries.

---

### Fix 2.3: Annotation Syntax Boost

**File**: `src/lib/search.ts`

**Implementation**:
```typescript
// Detect annotation queries
function hasAnnotationQuery(query: string): boolean {
  return query.includes('@') || /\b(annotation|@UI|@ObjectModel|@Consumption)\b/i.test(query);
}

// Boost annotation documentation for annotation queries
if (hasAnnotationQuery(query)) {
  if (r.id && (r.id.includes('_ANNO') || r.id.includes('ABENCDS_F1_'))) {
    boost += 1.5; // Strong boost for annotation docs
  }
}
```

**Expected Impact**: `@UI.lineItem` queries will return annotation docs in top 5.

---

## Priority 3: Future Improvements

### Fix 3.1: Comparison Query Detection

```typescript
// Detect "vs" / comparison queries
function hasComparisonIntent(query: string): boolean {
  return /\b(vs|versus|compare|comparison|difference|between)\b/i.test(query);
}

// Boost guideline documents for comparison queries
if (hasComparisonIntent(query) && r.id && r.id.includes('_GUIDL')) {
  boost += 0.5;
}
```

---

## Implementation Order

1. **Day 1**: Fix 1.1 (CleanABAP boost) + Fix 1.2 (News penalty)
2. **Day 2**: Fix 1.3 (SAP Help filtering) + Fix 2.1 (Core doc boost)
3. **Day 3**: Fix 2.2 (Transaction codes) + Fix 2.3 (Annotation boost)
4. **Day 4**: Re-run all 20 test scenarios and verify improvements

---

## Success Criteria

After implementing fixes:

| Scenario | Current Score | Target Score |
|----------|--------------|--------------|
| 15 (@UI.lineItem) | 2.1/5 | 4.0+/5 |
| 20 (Clean code) | 2.0/5 | 4.5+/5 |
| 14 (BDEF determination) | 3.5/5 | 4.5+/5 |
| 16 (ST05) | 3.0/5 | 4.0+/5 |
| 17 (Steampunk) | 4.0/5 | 4.5+/5 |

All scenarios should achieve 4.0/5 or higher relevance score.
