import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const initialValues = {
  email: '',
  password: '',
};

export default function LoginPage() {
  const { isAuthenticated, role, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    const redirectTo = role === 'Admin' ? '/admin' : location.state?.from || '/account';
    return <Navigate to={redirectTo} replace />;
  }

  const validate = () => {
    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!values.password) {
      nextErrors.password = 'Password is required.';
    } else if (values.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters long.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const authData = await login({ email: values.email.trim(), password: values.password });
      showToast('Login successful.', 'success');
      navigate(authData.user?.role === 'Admin' ? '/admin' : location.state?.from || '/account');
    } catch (error) {
      showToast(error.message || 'Unable to log in right now.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Welcome back</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-slate-900">Login to Laced</h1>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-slate-400"
            placeholder="you@example.com"
          />
          {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-12 text-slate-900 outline-none transition focus:border-slate-400"
              placeholder="Enter your password"
            />
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Need an account?{' '}
        <Link to="/signup" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">
          Create one
        </Link>
      </p>
    </div>
  );
}
