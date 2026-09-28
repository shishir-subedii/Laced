import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const initialValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
};

export default function SignupPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = () => {
    const nextErrors = {};

    if (!values.name.trim()) {
      nextErrors.name = 'Name is required.';
    }

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

    if (!values.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!values.acceptedTerms) {
      nextErrors.acceptedTerms = 'You must agree to the Terms and Conditions and Privacy Policy.';
    }

    return nextErrors;
  };

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
      await authApi.signup({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      showToast('Registration successful. Please sign in.', 'success');
      navigate('/login');
    } catch (error) {
      showToast(error.message || 'Unable to create your account right now.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-3xl font-semibold tracking-[-0.06em] text-slate-900">Sign up for Laced</h1>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="name">Name</label>
          <input id="name" name="name" value={values.name} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-slate-400" placeholder="John Doe" />
          {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={values.email} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-slate-400" placeholder="you@example.com" />
          {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={values.password} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-12 text-slate-900 outline-none transition focus:border-slate-400" placeholder="Choose a password" />
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Password must be at least 6 characters long.</p>
          {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="confirmPassword">Confirm password</label>
          <div className="relative">
            <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={values.confirmPassword} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-12 text-slate-900 outline-none transition focus:border-slate-400" placeholder="Re-enter your password" />
            <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900" aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}>
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input name="acceptedTerms" type="checkbox" checked={values.acceptedTerms} onChange={handleChange} className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
            <span>
              I agree to the <Link to="/terms" className="font-medium underline decoration-slate-300 underline-offset-4">Terms and Conditions</Link> and <Link to="/privacy" className="font-medium underline decoration-slate-300 underline-offset-4">Privacy Policy</Link>.
            </span>
          </label>
          {errors.acceptedTerms && <p className="mt-2 text-sm text-red-600">{errors.acceptedTerms}</p>}
        </div>

        <button type="submit" disabled={submitting} className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">Login</Link>
      </p>
    </div>
  );
}
