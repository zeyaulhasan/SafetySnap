import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'worker'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async e => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      await signup(formData.fullName, formData.username, formData.email, formData.password, formData.role);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center relative bg-slate-50 overflow-x-hidden py-12">
      {/* Background Orbs */}
      <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[500px] relative z-10 px-4">
        <div className="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-[2rem] p-8 md:p-10 shadow-[0_20px_40px_rgb(0,0,0,0.04)]">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Create Account</h1>
            <p className="text-slate-500 text-sm">Join SafetySnap to start monitoring site compliance.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text" id="fullName" name="fullName" value={formData.fullName} onChange={onChange} required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-700 placeholder-slate-400"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
                <input
                  type="text" id="username" name="username" value={formData.username} onChange={onChange} required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-700 placeholder-slate-400"
                  placeholder="johndoe88"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email" id="email" name="email" value={formData.email} onChange={onChange} required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-700 placeholder-slate-400"
                placeholder="name@company.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <input
                  type="password" id="password" name="password" value={formData.password} onChange={onChange} required minLength="6"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-700 placeholder-slate-400"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm</label>
                <input
                  type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={onChange} required minLength="6"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-700 placeholder-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Your Role</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${formData.role === 'worker' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="role" value="worker" checked={formData.role === 'worker'} onChange={onChange} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                    <span className="font-bold text-sm text-slate-900">Site Worker</span>
                  </div>
                  <span className="text-[11px] text-slate-500 ml-6 leading-tight">Upload photos & monitor</span>
                </label>

                <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${formData.role === 'manager' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="role" value="manager" checked={formData.role === 'manager'} onChange={onChange} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                    <span className="font-bold text-sm text-slate-900">Site Manager</span>
                  </div>
                  <span className="text-[11px] text-slate-500 ml-6 leading-tight">Full access (Recommended)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgb(5,150,105,0.3)] hover:shadow-[0_6px_20px_rgb(5,150,105,0.4)] hover:-translate-y-[1px] mt-4 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors">
                Log in instead
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;
