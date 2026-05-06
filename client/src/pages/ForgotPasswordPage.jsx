import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <p style={{ margin: '4px 0 0', color: '#bbf7d0', fontSize: 13 }}>Password Recovery</p>
          </div>

          {/* Body */}
          <div style={{ padding: '40px 40px 36px' }}>
            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={32} color="#16a34a" />
                </div>
                <h2 style={{ margin: '0 0 12px', color: '#111827', fontSize: 20, fontWeight: 700 }}>Check your inbox!</h2>
                <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>
                  If <strong style={{ color: '#111827' }}>{email}</strong> is registered, you'll receive a reset link shortly.
                </p>
                <p style={{ margin: '0 0 28px', color: '#9ca3af', fontSize: 13 }}>
                  Didn't get it? Check your spam folder or try again.
                </p>
                <button
                  onClick={() => { setSent(false); setEmail(''); }}
                  style={{ background: 'none', border: '2px solid #e5e7eb', borderRadius: 10, padding: '10px 24px', cursor: 'pointer', color: '#374151', fontSize: 14, fontWeight: 600 }}
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 44, height: 44, background: '#dcfce7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={20} color="#16a34a" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, color: '#111827', fontSize: 19, fontWeight: 700 }}>Forgot your password?</h2>
                    <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 13 }}>We'll send a reset link to your email</p>
                  </div>
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14 }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5e7eb',
                      borderRadius: 12, padding: '12px 16px', fontSize: 15, outline: 'none',
                      transition: 'border-color 0.2s', marginBottom: 20,
                    }}
                    onFocus={e => e.target.style.borderColor = '#16a34a'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', background: loading ? '#86efac' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15,
                      fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s',
                      boxShadow: '0 4px 16px rgba(22,163,74,0.25)',
                    }}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            )}

            <div style={{ marginTop: 28, textAlign: 'center' }}>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#16a34a', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                <ArrowLeft size={15} /> Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
