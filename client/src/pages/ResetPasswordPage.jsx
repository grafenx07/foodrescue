import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const redirectTimer = useRef(null);

  // Clear the redirect timer on unmount
  useEffect(() => () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); }, []);

  // Redirect to login if no token present
  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link');
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  const passwordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { level: 'weak', color: '#ef4444', label: 'Too short' };
    if (password.length < 8) return { level: 'fair', color: '#f59e0b', label: 'Fair' };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { level: 'strong', color: '#16a34a', label: 'Strong' };
    return { level: 'good', color: '#3b82f6', label: 'Good' };
  };

  const strength = passwordStrength();
  const matchOk = confirm.length > 0 && password === confirm;
  const matchFail = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      redirectTimer.current = setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
      <div className="w-full max-w-md">
        <div style={{ background: '#ffffff', borderRadius: '20px', boxShadow: '0 8px 40px rgba(22,163,74,0.10)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', padding: '32px 40px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.15)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Leaf size={26} color="#fff" />
            </div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 700 }}>FoodRescue</h1>
            <p style={{ margin: '4px 0 0', color: '#bbf7d0', fontSize: 13 }}>Set a new password</p>
          </div>

          {/* Body */}
          <div style={{ padding: '40px 40px 36px' }}>
            {success ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={32} color="#16a34a" />
                </div>
                <h2 style={{ margin: '0 0 12px', color: '#111827', fontSize: 20, fontWeight: 700 }}>Password Reset! 🎉</h2>
                <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>
                  Your password has been updated. Redirecting you to login…
                </p>
                <Link
                  to="/login"
                  style={{ display: 'inline-block', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#fff', textDecoration: 'none', padding: '12px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15 }}
                >
                  Go to Login →
                </Link>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 44, height: 44, background: '#dcfce7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Lock size={20} color="#16a34a" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, color: '#111827', fontSize: 19, fontWeight: 700 }}>Choose a new password</h2>
                    <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 13 }}>Make it strong and memorable</p>
                  </div>
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <XCircle size={16} /> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* New password */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px 44px 12px 16px', fontSize: 15, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#16a34a'}
                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {/* Strength indicator */}
                    {strength && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 4, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: strength.color, width: { weak: '25%', fair: '50%', good: '75%', strong: '100%' }[strength.level], transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: strength.color }}>{strength.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        required
                        style={{
                          width: '100%', boxSizing: 'border-box', border: `1.5px solid ${matchFail ? '#ef4444' : matchOk ? '#16a34a' : '#e5e7eb'}`,
                          borderRadius: 12, padding: '12px 44px 12px 16px', fontSize: 15, outline: 'none',
                        }}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      {matchOk && <CheckCircle size={16} color="#16a34a" style={{ position: 'absolute', right: 36, top: '50%', transform: 'translateY(-50%)' }} />}
                    </div>
                    {matchFail && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444' }}>Passwords don't match</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || matchFail}
                    style={{
                      width: '100%', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15,
                      fontWeight: 700, cursor: (loading || matchFail) ? 'not-allowed' : 'pointer',
                      opacity: (loading || matchFail) ? 0.7 : 1, boxShadow: '0 4px 16px rgba(22,163,74,0.25)',
                    }}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </>
            )}

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#16a34a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
