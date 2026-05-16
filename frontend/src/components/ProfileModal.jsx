import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Generate avatar initials from name or username
const getInitials = (user) => {
  if (user?.fullName) {
    return user.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return (user?.username || 'U')[0].toUpperCase();
};

const FIELD_CONFIGS = [
  { name: 'fullName',  label: 'Full Name',   type: 'text',  icon: '👤', placeholder: 'John Smith' },
  { name: 'username',  label: 'Username',    type: 'text',  icon: '🔑', placeholder: 'johnsmith' },
  { name: 'jobTitle',  label: 'Job Title',   type: 'text',  icon: '💼', placeholder: 'Safety Manager' },
  { name: 'company',   label: 'Company',     type: 'text',  icon: '🏢', placeholder: 'Acme Construction' },
  { name: 'phone',     label: 'Phone',       type: 'tel',   icon: '📞', placeholder: '+1 (555) 000-0000' },
  { name: 'location',  label: 'Location',    type: 'text',  icon: '📍', placeholder: 'New York, USA' },
  { name: 'bio',       label: 'Bio',         type: 'textarea', icon: '📝', placeholder: 'Tell us a bit about yourself...' },
];

export default function ProfileModal({ onClose }) {
  const { currentUser, updateProfile } = useAuth();
  const [form, setForm] = useState({
    fullName:  currentUser?.fullName  || '',
    username:  currentUser?.username  || '',
    jobTitle:  currentUser?.jobTitle  || '',
    company:   currentUser?.company   || '',
    phone:     currentUser?.phone     || '',
    location:  currentUser?.location  || '',
    bio:       currentUser?.bio       || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const backdropRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setSaved(false);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateProfile(form);
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const initials  = getInitials(currentUser);
  const memberSince = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    /* ── Backdrop ── */
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      {/* ── Modal panel ── */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2rem] shadow-[0_20px_60px_rgb(0,0,0,0.2)] bg-white overflow-hidden"
        style={{ animation: 'modalPop 0.22s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* ── Header with Emerald Gradient ── */}
        <div className="flex-shrink-0 bg-gradient-to-br from-slate-900 to-slate-800 px-8 pt-8 pb-8 text-white relative overflow-hidden">
          
          {/* Subtle background glow */}
          <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-50%] left-[-10%] w-[300px] h-[300px] bg-teal-500/20 rounded-full blur-[80px] pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white font-bold"
            aria-label="Close"
          >
            ✕
          </button>

          <div className="flex items-center gap-6 relative z-10">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 border-4 border-white/20 flex items-center justify-center text-3xl font-black shadow-[0_8px_20px_rgb(16,185,129,0.3)] select-none text-white">
              {initials}
            </div>
            <div>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
                {currentUser?.fullName || currentUser?.username || 'Your Profile'}
              </h2>
              <p className="text-emerald-300 font-bold text-sm mt-0.5">{currentUser?.email}</p>
              {currentUser?.jobTitle && (
                <p className="text-slate-300 text-xs font-semibold mt-1.5 flex items-center gap-1.5">
                  <span className="bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">{currentUser.jobTitle}</span>
                  {currentUser?.company && <span className="bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">{currentUser.company}</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable form body ── */}
        <form
          onSubmit={handleSave}
          className="flex flex-col flex-1 min-h-0 bg-slate-50"
        >
          {/* Scrollable middle section */}
          <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  Personal Details
                </h3>
                {memberSince && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
                    Member since {memberSince}
                  </span>
                )}
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold flex items-center gap-2">
                  ⚠️ {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {FIELD_CONFIGS.map(({ name, label, type, icon, placeholder }) =>
                  type === 'textarea' ? (
                    <div key={name} className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                        <span className="mr-1">{icon}</span>{label}
                      </label>
                      <textarea
                        name={name}
                        value={form[name]}
                        onChange={handleChange}
                        placeholder={placeholder}
                        disabled={!isEditing}
                        rows={3}
                        className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all ${!isEditing ? 'opacity-80 bg-slate-50 border-slate-200 cursor-not-allowed text-slate-600 font-medium' : 'bg-white border-slate-200 text-slate-800'}`}
                      />
                    </div>
                  ) : (
                    <div key={name}>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                        <span className="mr-1">{icon}</span>{label}
                      </label>
                      <input
                        type={type}
                        name={name}
                        value={form[name]}
                        onChange={handleChange}
                        placeholder={placeholder}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${!isEditing ? 'opacity-80 bg-slate-50 border-slate-200 cursor-not-allowed text-slate-600 font-medium' : 'bg-white border-slate-200 text-slate-800'}`}
                      />
                    </div>
                  )
                )}
              </div>

              {/* Read-only fields */}
              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-widest">
                    ✉️ Account Email
                  </label>
                  <div className="px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-xl text-slate-500 font-bold truncate">
                    {currentUser?.email}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-widest">
                    🛡️ Account Role
                  </label>
                  <div className="px-4 py-3 text-sm bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-bold capitalize flex items-center gap-2">
                    {currentUser?.role === 'manager' ? '👑 Site Manager' : '👷 Site Worker'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 px-8 py-5 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgb(0,0,0,0.02)]">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setForm({
                      fullName:  currentUser?.fullName  || '',
                      username:  currentUser?.username  || '',
                      jobTitle:  currentUser?.jobTitle  || '',
                      company:   currentUser?.company   || '',
                      phone:     currentUser?.phone     || '',
                      location:  currentUser?.location  || '',
                      bio:       currentUser?.bio       || '',
                    });
                    setError('');
                  }}
                  className="px-6 py-2.5 text-sm rounded-xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-6 py-2.5 text-sm rounded-xl font-bold text-white transition-all shadow-sm ${
                    saved
                      ? 'bg-teal-500 hover:bg-teal-600 shadow-[0_4px_14px_rgb(20,184,166,0.3)]'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_14px_rgb(5,150,105,0.3)]'
                  } disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2`}
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Saving…
                    </>
                  ) : saved ? (
                    <>✓ Saved!</>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm rounded-xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setIsEditing(true); }}
                  className="px-6 py-2.5 text-sm rounded-xl font-bold text-white transition-all shadow-[0_4px_14px_rgb(5,150,105,0.3)] bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5"
                >
                  Edit Profile
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
