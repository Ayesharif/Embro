import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Unhandled UI error', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        <div>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-sm text-white/70">An unexpected error occurred. Reloading the page usually fixes it.</p>
          <button type="button" className="btn btn-primary mt-6" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </main>
    )
  }
}
