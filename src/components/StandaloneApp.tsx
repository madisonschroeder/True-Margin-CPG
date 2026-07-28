// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Landing } from './components/Landing';
import { RLB_LOGO } from './components/logo';

const MainApp = React.lazy(() => import('./AppContent'));

export const StandaloneApp: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get('success') === 'true';

  const [route, setRoute] = useState<'landing' | 'login' | 'success' | 'app'>(
    isSuccess ? 'success' : window.location.hash === '#app' ? 'login' : 'landing'
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Check for stored auth
  useEffect(() => {
    const stored = localStorage.getItem('tm_auth_code');
    if (stored && route === 'login') {
      validateCode(stored, true);
    }
  }, []);

  const validateCode = async (code: string, silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await resp.json();
      if (data.valid) {
        localStorage.setItem('tm_auth_code', code.trim());
        setAuthenticated(true);
        setRoute('app');
        window.location.hash = '#app';
      } else if (!silent) {
        setError('Invalid access code. Please check your welcome email.');
      }
    } catch (err) {
      if (!silent) setError('Unable to verify. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!password.trim()) return;
    validateCode(password);
  };

  // Success page — after Stripe checkout
  if (route === 'success') {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
        <div className="card bg-base-200 w-full max-w-lg shadow-xl">
          <div className="card-body items-center text-center">
            <img src={RLB_LOGO} alt="Logo" className="h-12 mb-4" />
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-primary">Welcome to True Margin CPG!</h2>
            <p className="text-base-content/70 mt-2">
              Your subscription is confirmed. We're sending your <strong>unique access code</strong> to your email right now.
            </p>
            <div className="bg-info/10 border border-info/30 rounded-lg p-4 mt-4 w-full">
              <p className="text-sm text-info-content font-medium">📧 Check your inbox</p>
              <p className="text-xs text-base-content/60 mt-1">
                You'll receive a welcome email with your personal access code within a few minutes.
                Use it to log in below.
              </p>
            </div>
            <div className="divider text-xs text-base-content/40 my-4">ALREADY HAVE YOUR CODE?</div>
            <div className="form-control w-full">
              <input
                type="text"
                placeholder="Enter your access code"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="input input-bordered w-full text-center text-lg tracking-widest uppercase"
              />
            </div>
            {error && <p className="text-error text-sm mt-2">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={loading || !password.trim()}
              className="btn btn-primary w-full mt-3"
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Access Tool'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Landing page
  if (route === 'landing') {
    return <Landing onGetStarted={() => setRoute('login')} />;
  }

  // Login page
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
                type="text"
                placeholder="Access Code"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="input input-bordered w-full text-center text-lg tracking-widest uppercase"
              />
            </div>
            {error && <p className="text-error text-sm mt-2">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={loading || !password.trim()}
              className="btn btn-primary w-full mt-4"
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Access Tool'}
            </button>
            <button onClick={() => setRoute('landing')} className="btn btn-ghost btn-sm mt-2">
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main app
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
