import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [oobCode, setOobCode] = useState(null);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const code = searchParams.get('oobCode');
    if (!code) {
      setError("Invalid or missing reset code. Please request a new password reset email.");
      setLoading(false);
      return;
    }
    
    setOobCode(code);
    
    // Verify the code and get the user's email
    verifyPasswordResetCode(auth, code)
      .then((email) => {
        setEmail(email);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Invalid code:", err);
        setError("This password reset link has expired or is invalid. Please request a new one.");
        setLoading(false);
      });
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error("Reset failed:", err);
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-white shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/20 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <img src="/assets/logo.png" alt="Logo" className="w-10 h-10 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            {!document.querySelector('img[src="/assets/logo.png"]') && <span className="text-2xl font-bold text-primary">BH</span>}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Set New Password</CardTitle>
          <CardDescription className="text-slate-400">
            {email ? `Resetting password for ${email}` : 'Enter your new password below.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-medium text-white">Password Updated!</h3>
              <p className="text-slate-400">Your password has been successfully changed.</p>
              <Button className="w-full mt-4" onClick={() => navigate('/auth/login')}>
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-900">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {!error || oobCode ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">New Password</label>
                    <Input 
                      type="password" 
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white"
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Confirm Password</label>
                    <Input 
                      type="password" 
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white"
                      disabled={submitting}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full font-bold mt-6" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {submitting ? 'Updating...' : 'Update Password'}
                  </Button>
                </>
              ) : (
                <Button className="w-full mt-4" variant="outline" onClick={() => navigate('/auth/login')}>
                  Go to Login
                </Button>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
