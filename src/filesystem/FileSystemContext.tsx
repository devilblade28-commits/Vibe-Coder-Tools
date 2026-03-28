/**
 * FileSystem Context - React state management for file system operations.
 * 
 * Provides:
 * - Files, folders, and assets state
 * - Active file tracking
 * - CRUD operations for all file system entities
 * - Loading and error states
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { 
  ProjectFile, 
  ProjectFolder, 
  ProjectAsset, 
  FileSystemState,
  CreateFileInput 
} from './filesystemTypes'
import * as fileService from './fileService'
import * as folderService from './folderService'
import * as assetService from './assetService'

// ─── Context Types ────────────────────────────────────────────────────────────

interface FileSystemContextValue extends FileSystemState {
  // File operations
  loadFiles: (projectId: string) => Promise<void>
  createFile: (projectId: string, input: CreateFileInput) => Promise<ProjectFile>
  updateFile: (file: ProjectFile, content: string) => Promise<ProjectFile>
  deleteFile: (fileId: string) => Promise<void>
  upsertFileByName: (projectId: string, name: string, content: string, folderId?: string | null) => Promise<ProjectFile>
  
  // Folder operations
  loadFolders: (projectId: string) => Promise<void>
  createFolder: (projectId: string, name: string, parentId?: string | null) => Promise<ProjectFolder>
  deleteFolder: (folderId: string) => Promise<void>
  
  // Asset operations
  loadAssets: (projectId: string) => Promise<void>
  createAsset: (projectId: string, file: File) => Promise<ProjectAsset>
  deleteAsset: (assetId: string) => Promise<void>
  
  // Active file management
  setActiveFile: (file: ProjectFile | null) => void
  getActiveFile: () => ProjectFile | null
  
  // Hydration
  loadFullProject: (projectId: string) => Promise<void>
  clearFileSystem: () => void
}

const FileSystemContext = createContext<FileSystemContextValue | null>(null)

// ─── Provider Component ───────────────────────────────────────────────────────

interface FileSystemProviderProps {
  children: ReactNode
  projectId?: string | null
}

export function FileSystemProvider({ children, projectId }: FileSystemProviderProps) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [folders, setFolders] = useState<ProjectFolder[]>([])
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-load when projectId changes
  useEffect(() => {
    if (projectId) {
      loadFullProject(projectId)
    } else {
      clearFileSystem()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // ─── File Operations ───────────────────────────────────────────────────────

  const loadFiles = useCallback(async (projId: string): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      const loadedFiles = await fileService.getFiles(projId)
      setFiles(loadedFiles)
      
      // Validate activeFileId if we have an active file
      if (activeFile) {
        const stillExists = loadedFiles.find(f => f.id === activeFile.id)
        if (!stillExists) {
          setActiveFile(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setIsLoading(false)
    }
  }, [activeFile])

  const createFile = useCallback(async (
    projId: string, 
    input: CreateFileInput
  ): Promise<ProjectFile> => {
    try {
      setError(null)
      const file = await fileService.createFile(projId, input)
      setFiles(prev => [...prev, file])
      return file
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create file'
      setError(message)
      throw err
    }
  }, [])

  const updateFile = useCallback(async (
    file: ProjectFile, 
    content: string
  ): Promise<ProjectFile> => {
    try {
      setError(null)
      const updated = await fileService.updateFile(file, content)
      setFiles(prev => prev.map(f => f.id === updated.id ? updated : f))
      // Update active file if it's the one being updated
      if (activeFile?.id === updated.id) {
        setActiveFile(updated)
      }
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update file'
      setError(message)
      throw err
    }
  }, [activeFile?.id])

  const deleteFile = useCallback(async (fileId: string): Promise<void> => {
    try {
      setError(null)
      await fileService.deleteFile(fileId)
      setFiles(prev => prev.filter(f => f.id !== fileId))
      // Clear active file if it's the one being deleted
      if (activeFile?.id === fileId) {
        setActiveFile(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file'
      setError(message)
      throw err
    }
  }, [activeFile?.id])

  const upsertFileByName = useCallback(async (
    projectId: string,
    name: string,
    content: string,
    folderId?: string | null
  ): Promise<ProjectFile> => {
    try {
      setError(null)
      const file = await fileService.upsertFileByName(projectId, name, content, folderId ?? null)
      // Update files list (either add or update)
      setFiles(prev => {
        const existing = prev.find(f => f.id === file.id)
        if (existing) {
          return prev.map(f => f.id === file.id ? file : f)
        }
        return [...prev, file]
      })
      return file
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upsert file'
      setError(message)
      throw err
    }
  }, [])

  // ─── Folder Operations ──────────────────────────────────────────────────────

  const loadFolders = useCallback(async (projId: string): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      const loadedFolders = await folderService.getFolders(projId)
      setFolders(loadedFolders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createFolderFn = useCallback(async (
    projectId: string,
    name: string,
    parentId?: string | null
  ): Promise<ProjectFolder> => {
    try {
      setError(null)
      const folder = await folderService.createFolder(projectId, name, parentId ?? null)
      setFolders(prev => [...prev, folder])
      return folder
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create folder'
      setError(message)
      throw err
    }
  }, [])

  const deleteFolder = useCallback(async (folderId: string): Promise<void> => {
    try {
      setError(null)
      await folderService.deleteFolder(folderId)
      setFolders(prev => prev.filter(f => f.id !== folderId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete folder'
      setError(message)
      throw err
    }
  }, [])

  // ─── Asset Operations ───────────────────────────────────────────────────────

  const loadAssets = useCallback(async (projId: string): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      const loadedAssets = await assetService.getAssets(projId)
      setAssets(loadedAssets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createAssetFn = useCallback(async (
    projectId: string,
    file: File
  ): Promise<ProjectAsset> => {
    try {
      setError(null)
      const asset = await assetService.createAsset(projectId, file)
      setAssets(prev => [...prev, asset])
      return asset
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create asset'
      setError(message)
      throw err
    }
  }, [])

  const deleteAsset = useCallback(async (assetId: string): Promise<void> => {
    try {
      setError(null)
      await assetService.deleteAsset(assetId)
      setAssets(prev => prev.filter(a => a.id !== assetId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete asset'
      setError(message)
      throw err
    }
  }, [])

  // ─── Active File Management ─────────────────────────────────────────────────

  const setActiveFileHandler = useCallback((file: ProjectFile | null): void => {
    setActiveFile(file)
  }, [])

  const getActiveFile = useCallback((): ProjectFile | null => {
    return activeFile
  }, [activeFile])

  // ─── Hydration ──────────────────────────────────────────────────────────────

  const loadFullProject = useCallback(async (projId: string): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [loadedFiles, loadedFolders, loadedAssets] = await Promise.all([
        fileService.getFiles(projId),
        folderService.getFolders(projId),
        assetService.getAssets(projId),
      ])
      
      setFiles(loadedFiles)
      setFolders(loadedFolders)
      setAssets(loadedAssets)
      
      // Validate active file still exists
      if (activeFile) {
        const stillExists = loadedFiles.find(f => f.id === activeFile.id)
        if (!stillExists) {
          setActiveFile(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }, [activeFile])

  const clearFileSystem = useCallback((): void => {
    setFiles([])
    setFolders([])
    setAssets([])
    setActiveFile(null)
    setError(null)
    setIsLoading(false)
  }, [])

  // ─── Context Value ──────────────────────────────────────────────────────────

  const value: FileSystemContextValue = {
    // State
    files,
    folders,
    assets,
    activeFile,
    isLoading,
    error,
    
    // File operations
    loadFiles,
    createFile,
    updateFile,
    deleteFile,
    upsertFileByName,
    
    // Folder operations
    loadFolders,
    createFolder: createFolderFn,
    deleteFolder,
    
    // Asset operations
    loadAssets,
    createAsset: createAssetFn,
    deleteAsset,
    
    // Active file management
    setActiveFile: setActiveFileHandler,
    getActiveFile,
    
    // Hydration
    loadFullProject,
    clearFileSystem,
  }

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  )
}

// ─── Custom Hook ──────────────────────────────────────────────────────────────

/**
 * Hook to access the file system context.
 * Throws an error if used outside of FileSystemProvider.
 */
export function useFileSystem(): FileSystemContextValue {
  const context = useContext(FileSystemContext)
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider')
  }
  return context
}

// ─── Exports ───────────────────────────────────────────────────────────────────

export { FileSystemContext }