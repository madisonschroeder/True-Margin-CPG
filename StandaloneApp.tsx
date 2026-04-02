// @ts-nocheck
import React, { useState } from 'react';
import { Landing } from './components/Landing';
import { RLB_LOGO } from './components/logo';

const MainApp = React.lazy(() => import('./AppContent'));

type Route = 'landing' | 'login' | 'app' | 'success';

const getInitialRoute = (): Route => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('success')) return 'success';
  if (window.location.hash === '#app') return 'login';
  return 'landing';
};

export const StandaloneApp: React.FC = () => {
  const [route, setRoute] = useState<Route>(getInitialRoute);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [validating, setValidating] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) return;
    setValidating(true);
    setError('');
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: password.trim() }),
      });
      if (res.ok) {
        // Store access code for AI chat
        localStorage.setItem('tm_access_code', password.trim().toUpperCase());
        setAuthenticated(true);
        setRoute('app');
        window.location.hash = '#app';
      } else {
        setError('Invalid access code. Please check your welcome email.');
      }
    } catch {
      // Fallback to hardcoded check if API is down
      if (password.trim().toUpperCase() === 'TRUEMARGIN2026') {
        localStorage.setItem('tm_access_code', 'TRUEMARGIN2026');
        setAuthenticated(true);
        setRoute('app');
        window.location.hash = '#app';
      } else {
        setError('Unable to validate. Please try again.');
      }
    } finally {
      setValidating(false);
    }
  };

  if (route === 'success') {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
        <div className="card bg-base-200 w-full max-w-lg shadow-xl">
          <div className="card-body items-center text-center">
            <img src={RLB_LOGO} alt="Logo" className="h-12 mb-4" />
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-primary">Welcome to True Margin CPG!</h2>
            <p className="text-base-content/70 mt-2">
              Your subscription is active. Check your email for your unique access code.
            </p>
            <div className="bg-info/10 border border-info/30 rounded-lg p-3 mt-4 w-full text-left">
              <p className="text-sm text-base-content/70">
                <strong>📧 Check your inbox!</strong> We've sent your personal access code to your email.
                Use it to log in below.
              </p>
            </div>
            <button
              onClick={() => { setRoute('login'); window.history.replaceState({}, '', window.location.pathname); window.location.hash = '#app'; }}
              className="btn btn-primary btn-lg w-full mt-6"
            >
              Go to Login →
            </button>
            <button onClick={() => { setRoute('landing'); window.history.replaceState({}, '', window.location.pathname); }} className="btn btn-ghost btn-sm mt-2">
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (route === 'landing') {
    return <Landing onGetStarted={() => setRoute('login')} />;
  }

  if (route === 'login' && !authenticated) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
        <div className="card bg-base-200 w-full max-w-md shadow-xl">
          <div className="card-body items-center text-center">
            <img src={RLB_LOGO} alt="Logo" className="h-12 mb-4" />
            <h2 className="text-2xl font-bold text-primary tracking-wider">TRUE MARGIN CPG</h2>
            <p className="text-base-content/60 text-sm mt-2">Enter your access code to continue</p>
            <div className="form-control w-full mt-4">
              <input
                type="password"
                placeholder="Access Code"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="input input-bordered w-full text-center text-lg tracking-widest"
                disabled={validating}
              />
            </div>
            {error && <p className="text-error text-sm mt-2">{error}</p>}
            <button onClick={handleLogin} className={`btn btn-primary w-full mt-4 ${validating ? 'loading' : ''}`} disabled={validating}>
              {validating ? 'Validating...' : 'Access Tool'}
            </button>
            <button onClick={() => setRoute('landing')} className="btn btn-ghost btn-sm mt-2">
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    }>
      <MainApp />
    </React.Suspense>
  );
};
