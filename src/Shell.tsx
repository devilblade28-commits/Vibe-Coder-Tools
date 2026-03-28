/**
 * Shell — Mobile-responsive app layout.
 *
 * USAGE (in App.tsx or your router):
 *   <Shell sidebar={<MySidebarContent />}>
 *     <Page>...</Page>
 *   </Shell>
 *
 * The sidebar is hidden on mobile and toggled by the built-in hamburger button.
 * Customize sidebar width, colors, and nav items — but keep this structure.
 */
import React from 'react'

interface ShellProps {
  /** Sidebar content */
  sidebar: React.ReactNode
  /** App name shown in mobile header */
  appName?: string
  children: React.ReactNode
}

/** Unused layout component — kept as a standalone stub (no external dependencies). */
export function Shell({ sidebar: _sidebar, appName: _appName = 'App', children }: ShellProps) {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {children}
    </div>
  )
}
