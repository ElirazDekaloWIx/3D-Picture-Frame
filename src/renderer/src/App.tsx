import React from 'react'
import { AppLayout } from '@ui/layout/AppLayout'
import { useKeyboardShortcuts } from '@ui/useKeyboardShortcuts'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('App Error:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ color: 'red', padding: 40, fontFamily: 'monospace' }}>
          <h1>Error</h1>
          <pre>{this.state.error.message}</pre>
          <pre>{this.state.error.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

function AppWithShortcuts() {
  useKeyboardShortcuts()
  return <AppLayout />
}

export function App() {
  return (
    <ErrorBoundary>
      <AppWithShortcuts />
    </ErrorBoundary>
  )
}
