import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[MediKiosk] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-xl w-full shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-2xl mb-4">
              !
            </div>
            <h1 className="text-2xl font-bold mb-2">MediKiosk Interface Error</h1>
            <p className="text-slate-400 text-sm mb-4">
              An unexpected error occurred during rendering. Please click below to reload the application.
            </p>
            <pre className="p-4 bg-slate-950 rounded-xl text-xs text-red-400 font-mono overflow-auto mb-6 max-h-48 whitespace-pre-wrap">
              {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-6 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition"
            >
              Reload MediKiosk
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const mountApp = () => {
  let rootEl = document.getElementById('root');
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);
  }
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}


