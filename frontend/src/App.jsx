import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Gallery from './pages/Gallery';
import Analytics from './pages/Analytics';
import LiveMonitor from './pages/LiveMonitor';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

function AppContent() {
  const { currentUser } = useAuth();
  const isAuthenticated = !!currentUser;
  const isManager = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={isAuthenticated} currentUser={currentUser} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload"         element={isAuthenticated ? <Upload />    : <Navigate to="/login" />} />
          <Route path="/live"           element={isAuthenticated ? <LiveMonitor /> : <Navigate to="/login" />} />
          <Route path="/gallery"        element={isAuthenticated ? (isManager ? <Gallery /> : <Navigate to="/" />) : <Navigate to="/login" />} />
          <Route path="/analytics"      element={isAuthenticated ? (isManager ? <Analytics /> : <Navigate to="/" />) : <Navigate to="/login" />} />
          <Route path="/login"          element={!isAuthenticated ? <Login />    : <Navigate to="/" />} />
          <Route path="/register"       element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/" />} />
          <Route path="/reset-password/:token" element={!isAuthenticated ? <ResetPassword /> : <Navigate to="/" />} />
        </Routes>
      </main>
      <footer className="bg-gray-100 py-4">
        <div className="container mx-auto px-4 text-center text-gray-600">
          &copy; {new Date().getFullYear()} SafetySnap — PPE Detection &amp; Compliance Analytics
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
