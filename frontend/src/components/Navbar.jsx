import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import ProfileModal from './ProfileModal';

// Derive initials from the user object
const getInitials = (user) => {
  if (user?.fullName) {
    return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return (user?.username || 'U')[0].toUpperCase();
};

const getAvatarGradient = (username = '') => {
  const gradients = [
    'from-violet-500 to-purple-700',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600',
  ];
  return gradients[username.charCodeAt(0) % gradients.length];
};

const Navbar = ({ isAuthenticated, currentUser }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      setDropdownOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = getInitials(currentUser);
  const gradient = getAvatarGradient(currentUser?.username);
  const isManager = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin');

  return (
    <>
      <nav className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="text-2xl font-bold flex items-center">
              <svg className="w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#FFD700" stroke="#FF8C00" strokeWidth="2" />
                <path d="M2 17L12 22L22 17" stroke="#FFD700" strokeWidth="2" />
                <path d="M2 12L12 17L22 12" stroke="#FFD700" strokeWidth="2" />
              </svg>
              SafetySnap
            </Link>

            <div className="flex items-center space-x-6">
              <Link to="/" className="hover:text-safety-yellow transition-colors">Home</Link>

              {isAuthenticated ? (
                <>
                  <Link to="/upload" className="hover:text-safety-yellow transition-colors">Upload</Link>
                  <Link to="/live" className="hover:text-safety-yellow transition-colors flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live
                  </Link>
                  {isManager && (
                    <>
                      <Link to="/gallery" className="hover:text-safety-yellow transition-colors">Gallery</Link>
                      <Link to="/analytics" className="hover:text-safety-yellow transition-colors">Analytics</Link>
                    </>
                  )}

                  {/* User avatar + dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(o => !o)}
                      className="flex items-center group"
                      title="Account options"
                    >
                      {/* Avatar circle */}
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} border-2 border-white/40 flex items-center justify-center text-sm font-bold text-white shadow-md group-hover:border-safety-yellow transition-all duration-200 select-none`}
                      >
                        {initials}
                      </div>
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 mt-3 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-40 overflow-hidden"
                        style={{ animation: 'dropdownFade 0.15s ease both' }}
                      >
                        {/* Mini profile header */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-bold text-white select-none`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {currentUser?.fullName || currentUser?.username}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* View / Edit Profile */}
                        <button
                          onClick={() => { setDropdownOpen(false); setProfileOpen(true); }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Edit Profile
                        </button>

                        <div className="border-t border-gray-100 mt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="hover:text-safety-yellow transition-colors font-medium">Login</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Profile modal — rendered at root level to avoid stacking context issues */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}

      <style>{`
        @keyframes dropdownFade {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default Navbar;
