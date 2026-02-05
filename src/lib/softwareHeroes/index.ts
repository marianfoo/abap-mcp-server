/**
 * Software Heroes module - exports for ABAP Feature Matrix
 */

// ABAP Feature Matrix
export {
  searchFeatureMatrix,
  getFeatureMatrixCacheStats,
  type SearchFeatureMatrixResult,
} from "./abapFeatureMatrix.js";

// Core utilities (if needed externally)
export { TtlCache, getCacheStats } from "./core.js";
