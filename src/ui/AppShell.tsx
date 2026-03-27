/**
 * Mobile app shell — header + content area + bottom nav.
 * Spec: 3 equal primary tabs (Chat, Files, Preview) + small Settings icon-only tab.
 */
import type { ReactNode } from 'react'
import type { TabId } from '../types'

// Filled and outline icon pairs for active/inactive states
function IconChat({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function IconFiles({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 7H13l-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function IconPreview({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}

interface AppShellProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  header: ReactNode
  children: ReactNode
}

const PRIMARY_TABS: { id: TabId; label: string; Icon: React.ComponentType<{ filled: boolean }> }[] = [
  { id: 'chat',    label: 'Chat',    Icon: IconChat },
  { id: 'files',   label: 'Files',   Icon: IconFiles },
  { id: 'preview', label: 'Preview', Icon: IconPreview },
]

export function AppShell({ activeTab, onTabChange, header, children }: AppShellProps) {
  return (
    <div
      className="flex flex-col bg-[#0d0d0f]"
      style={{ height: '100dvh', maxWidth: '430px', margin: '0 auto' }}
    >
      {/* Header */}
      <header
        style={{
          height: '56px',
          flexShrink: 0,
          background: '#141416',
          borderBottom: '1px solid #1f1f23',
          display: 'flex',
          alignItems: 'center',
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: '4px',
          paddingRight: '4px',
          gap: '2px',
        }}
      >
        {header}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav
        style={{
          flexShrink: 0,
          background: '#141416',
          borderTop: '1px solid #1f1f23',
          display: 'flex',
          alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: '4px',
          paddingRight: '4px',
        }}
      >
        {/* 3 equal primary tabs */}
        {PRIMARY_TABS.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1,
                height: '60px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
                color: isActive ? '#a855f7' : '#4a4a54',
                minHeight: '44px',
              }}
            >
              {/* Active bar */}
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '20%',
                    right: '20%',
                    height: '2px',
                    background: '#a855f7',
                    borderRadius: '0 0 3px 3px',
                  }}
                />
              )}
              <tab.Icon filled={isActive} />
              <span style={{
                fontSize: '11px',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.01em',
                lineHeight: 1,
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}

        {/* Divider */}
        <div style={{ width: '1px', height: '28px', background: '#1f1f23', flexShrink: 0, margin: '0 2px' }} />

        {/* Settings — icon only, smaller */}
        <button
          onClick={() => onTabChange('settings')}
          style={{
            width: '52px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
            color: activeTab === 'settings' ? '#a855f7' : '#4a4a54',
            position: 'relative',
          }}
        >
          {activeTab === 'settings' && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: '15%',
                right: '15%',
                height: '2px',
                background: '#a855f7',
                borderRadius: '0 0 3px 3px',
              }}
            />
          )}
          <IconSettings />
        </button>
      </nav>
    </div>
  )
}
