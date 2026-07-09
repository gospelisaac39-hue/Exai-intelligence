import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import AuthLayout, { FormError, Field, SubmitButton } from '../components/AuthLayout.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Portfolio Intelligence for your own accounts">
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        No account?{' '}
        <Link to="/signup" className="text-accent-soft hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
