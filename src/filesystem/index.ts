/**
 * FileSystem Layer - Barrel Export
 * 
 * Exports all file system-related functionality:
 * - Types
 * - Service functions (files, folders, assets)
 * - React context and hook
 */

// Types
export type {
  ProjectFile,
  CreateFileInput,
  UpdateFileInput,
  ProjectFolder,
  CreateFolderInput,
  ProjectAsset,
  FileSystemUIState,
  FileSystemState,
} from './filesystemTypes'

// File service functions
export {
  getFiles,
  createFile,
  updateFile,
  deleteFile,
  upsertFileByName,
  isValidFileName,
  getFileExtension,
  isTextExtension,
  getFileTemplate,
} from './fileService'

// Folder service functions
export {
  getFolders,
  createFolder,
  deleteFolder,
  getDescendantFolderIds,
} from './folderService'

// Asset service functions
export {
  getAssets,
  createAsset,
  createAssetFromBlob,
  deleteAsset,
  getAssetUrl,
  revokeAssetUrl,
} from './assetService'

// React context and hook
export { FileSystemProvider, useFileSystem, FileSystemContext } from './FileSystemContext'