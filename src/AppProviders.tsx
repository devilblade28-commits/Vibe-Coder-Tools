/**
 * AppProviders - Root Context Provider Composition
 * 
 * This component composes all context providers in the correct order:
 * 1. WorkspaceProvider - Manages active project and project index
 * 2. FileSystemProvider - Manages files, folders, and assets for the active project
 * 3. AIProvider - Manages AI chat state and settings
 * 4. PreviewProvider - Manages preview HTML and asset URLs
 * 
 * Layer Architecture:
 * - Storage Layer (IndexedDB/localStorage) is used internally by the service layers
 * - Workspace Layer depends on Storage Layer
 * - FileSystem Layer depends on Storage Layer and receives projectId from Workspace
 * - AI Layer depends on Storage Layer for settings
 * - Preview Layer depends on FileSystem for files/assets
 */

import { type ReactNode } from 'react'
import { WorkspaceProvider } from './workspace/WorkspaceContext'
import { FileSystemProvider } from './filesystem/FileSystemContext'
import { AIProvider } from './ai/AIContext'
import { PreviewProvider } from './preview/PreviewContext'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * Composes all context providers in the correct dependency order.
 * 
 * Provider hierarchy (innermost to outermost):
 * - PreviewProvider: Preview state (depends on files from FileSystem)
 * - FileSystemProvider: Files/folders/assets (depends on projectId from Workspace)
 * - AIProvider: AI chat and settings (standalone)
 * - WorkspaceProvider: Active project and index (outermost)
 * 
 * Note: FileSystemProvider needs the projectId from WorkspaceProvider,
 * so we need to connect them. We do this via a connector component.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <WorkspaceProvider>
      <WorkspaceConnector>
        <AIProvider>
          <PreviewProvider>
            {children}
          </PreviewProvider>
        </AIProvider>
      </WorkspaceConnector>
    </WorkspaceProvider>
  )
}

/**
 * Connector component that bridges WorkspaceProvider and FileSystemProvider.
 * Reads the active project ID from WorkspaceContext and passes it to FileSystemProvider.
 */
import { useWorkspace } from './workspace/WorkspaceContext'

function WorkspaceConnector({ children }: { children: ReactNode }) {
  const { activeProject } = useWorkspace()
  const projectId = activeProject?.id ?? null
  
  return (
    <FileSystemProvider projectId={projectId}>
      {children}
    </FileSystemProvider>
  )
}