/**
 * Storage Layer - Index
 * 
 * This module exports all storage services and types.
 * Import from here for convenience:
 * 
 * ```ts
 * import { hydrateAtStartup, STORAGE_KEYS, type ProjectIndexItem } from '@/storage'
 * ```
 */

// Types
export type { 
  StorageKey, 
  ProjectIndexItem, 
  HydrationResult 
} from './storageTypes'
export { STORAGE_KEYS, getApiKeyKey } from './storageTypes'

// localStorage Service
export {
  // Provider & Model
  getActiveProvider,
  setActiveProvider,
  getActiveModel,
  setActiveModel,
  getApiKey,
  setApiKey,
  
  // Custom Provider
  getCustomProviderConfig,
  setCustomProviderConfig,
  
  // Custom Instruction
  getCustomInstruction,
  setCustomInstruction,
  
  // Project Index
  getProjectIndex,
  setProjectIndex,
  addProjectToIndex,
  updateProjectInIndex,
  removeProjectFromIndex,
  
  // Last Project
  getLastProjectId,
  setLastProjectId,
  
  // Theme & Preferences
  getTheme,
  setTheme,
  getPreferences,
  
  // AI Settings
  getAISettings,
  type AISettingsSnapshot,
  
  // Reset
  clearAllAppKeys,
} from './localStorageService'

// IndexedDB Service
export {
  // Database
  openDB,
  deleteDatabase,
  
  // Projects
  getProject,
  putProject,
  deleteProject,
  
  // Files
  getFilesForProject,
  getFile,
  putFile,
  deleteFile,
  deleteFilesForProject,
  
  // Folders
  getFoldersForProject,
  putFolder,
  deleteFolder,
  deleteFoldersForProject,
  
  // Assets
  getAssetsForProject,
  getAsset,
  putAsset,
  deleteAsset,
  deleteAssetsForProject,
} from './indexedDBService'

// Hydration Service
export {
  hydrateAtStartup,
  updateProjectIndex,
  removeProjectFromIndex as removeProjectFromHydrationIndex,
  setLastProjectId as setLastProjectIdInHydration,
  getProjectIndex as getProjectIndexFromHydration,
} from './hydrationService'