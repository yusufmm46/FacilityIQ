import React, { useState } from 'react';
import { Key, ArrowRight, Eye, EyeOff, ShieldCheck, Activity, KeySquare } from 'lucide-react';

export default function SignInView({ onLoginSuccess }) {
  const [email, setEmail] = useState('name@company.com');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => onLoginSuccess(email), 900);
    }, 1600);
  };

  const handleSSO = () => {
    setIsSuccess(true);
    setTimeout(() => onLoginSuccess('sso@company.com'), 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-sans text-on-surface p-6 relative overflow-hidden bg-slate-100">
      {/* Decorative orbs */}
      <div className="absolute w-[600px] h-[600px] bg-sky-200 rounded-full blur-[100px] opacity-40 -top-40 -left-40 animate-pulse pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-teal-200 rounded-full blur-[100px] opacity-40 -bottom-40 -right-40 animate-pulse pointer-events-none" style={{ animationDelay: '-5s' }} />

      <main className="w-full max-w-[1200px] grid md:grid-cols-12 items-center gap-12 z-10 relative">
        {/* Left branding */}
        <div className="hidden md:flex md:col-span-6 flex-col space-y-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 primary-gradient rounded-2xl flex items-center justify-center shadow-xl border border-white/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-primary tracking-tight">FacilityIQ</h1>
              <p className="font-mono text-xs text-secondary uppercase tracking-widest font-bold">
                Smart Occupancy Intelligence
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-display text-4xl font-extrabold text-primary leading-tight">
              Predictive space management <br />
              for the <span className="text-secondary">modern workforce.</span>
            </h2>
            <p className="font-sans text-base text-on-surface-variant max-w-md leading-relaxed">
              Harness real-time data to optimize building efficiency, enhance tenant experience, and reduce
              operational costs with FacilityIQ.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { icon: Activity, label: 'Live Analytics' },
                { icon: ShieldCheck, label: 'Enterprise Security' },
                { icon: Key, label: 'Cloud Integrated' },
                { icon: KeySquare, label: 'ESG Tracking' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center space-x-3">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right login card */}
        <div className="col-span-12 md:col-span-6 flex justify-center md:justify-end">
          <div className="w-full max-w-[480px] rounded-2xl p-8 flex flex-col space-y-6 border border-white bg-white/90 shadow-xl">
            {/* Mobile branding */}
            <div className="md:hidden flex flex-col items-center text-center space-y-3 mb-2">
              <div className="w-12 h-12 primary-gradient rounded-xl flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-primary tracking-tight">FacilityIQ</h1>
                <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Occupancy Intelligence
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold text-primary">Welcome Back</h3>
              <p className="font-sans text-xs text-on-surface-variant">Access your intelligence dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-1">
                <label htmlFor="email" className="font-mono text-[10px] uppercase font-bold text-on-surface-variant">
                  Professional Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-b-2 border-slate-200 focus:border-secondary transition-all outline-none rounded-t-lg py-3 px-4 text-xs font-medium text-primary"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="font-mono text-[10px] uppercase font-bold text-on-surface-variant">
                    Security Key
                  </label>
                  <a href="#!" className="font-mono text-[10px] text-secondary hover:underline transition-all">
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-b-2 border-slate-200 focus:border-secondary transition-all outline-none rounded-t-lg py-3 px-4 pr-12 text-xs font-medium text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-secondary cursor-pointer"
                />
                <label htmlFor="remember" className="text-xs text-on-surface-variant cursor-pointer select-none font-medium">
                  Remember this device for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || isSuccess}
                className={`brand-gradient-btn w-full py-3.5 rounded-full font-display font-bold text-white shadow-lg flex items-center justify-center space-x-2 active:scale-[0.98] transition-all ${
                  isLoading || isSuccess ? 'opacity-80 cursor-wait' : 'cursor-pointer'
                }`}
                style={isSuccess ? { background: '#2EA056' } : {}}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying Credentials...</span>
                  </>
                ) : isSuccess ? (
                  <span>✓ Authenticated</span>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 flex flex-col space-y-4 items-center text-center">
              <div className="w-full flex items-center space-x-4">
                <div className="h-px bg-slate-100 flex-grow" />
                <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-wider">Enterprise Login</span>
                <div className="h-px bg-slate-100 flex-grow" />
              </div>

              <button
                onClick={handleSSO}
                className="w-full flex items-center justify-center space-x-2.5 py-3 px-6 rounded-full border border-slate-200 font-sans text-xs text-on-surface hover:bg-slate-50 transition-colors font-semibold"
              >
                <Key className="w-4 h-4 text-slate-500" />
                <span>Single Sign-On (SSO)</span>
              </button>

              <p className="text-xs text-on-surface-variant font-medium">
                Don't have an account?{' '}
                <a href="#!" className="text-secondary font-bold hover:underline transition-all">
                  Contact Administrator
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-4 left-0 w-full px-6 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 font-mono tracking-wider space-y-2 sm:space-y-0">
        <div>© 2026 FacilityIQ Intelligence. All rights reserved.</div>
        <div className="flex space-x-4">
          <a className="hover:text-secondary transition-colors" href="#!">Privacy Policy</a>
          <span>•</span>
          <a className="hover:text-secondary transition-colors" href="#!">Terms of Service</a>
          <span>•</span>
          <a className="hover:text-secondary transition-colors" href="#!">System Status</a>
        </div>
      </footer>
    </div>
  );
}
