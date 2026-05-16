import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const isManager = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin');

  return (
    <div className="min-h-[calc(100vh-80px)] overflow-x-hidden relative font-sans">
      
      {/* ── Background Glow Effects ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 relative z-10">
        
        {/* ── Hero Section ── */}
        <div className="text-center max-w-4xl mx-auto mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold text-sm mb-8 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            AI-Powered Site Monitoring
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-[1.1]">
            Next-Generation <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">
              Safety Intelligence
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Automate PPE compliance with unparalleled AI-powered vision. Detect hard hats and safety vests in real-time to ensure site-wide protection and eliminate human error.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isAuthenticated ? (
              <Link 
                to="/upload" 
                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-emerald-600 font-pj rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 shadow-[0_8px_30px_rgb(5,150,105,0.3)] hover:shadow-[0_8px_30px_rgb(5,150,105,0.5)] hover:-translate-y-1 w-full sm:w-auto"
              >
                Scan New Image
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-emerald-600 font-pj rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 shadow-[0_8px_30px_rgb(5,150,105,0.3)] hover:-translate-y-1 w-full sm:w-auto"
              >
                Get Started
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </Link>
            )}
            
            {(isAuthenticated && isManager) && (
              <Link 
                to="/analytics" 
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-gray-700 transition-all duration-200 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 w-full sm:w-auto"
              >
                View Analytics
              </Link>
            )}
          </div>
        </div>

        {/* ── Feature Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          <div className="bg-white/60 backdrop-blur-xl border border-gray-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-2 group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
              📸
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Instant AI Analysis</h3>
            <p className="text-gray-500 leading-relaxed">
              Upload photos from the field and let our deep-learning model identify safety equipment with incredible precision in seconds.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-gray-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-2 group">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
              🛡️
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Live Monitor</h3>
            <p className="text-gray-500 leading-relaxed">
              Connect to your webcam for real-time site monitoring. Capture instant snapshots when violations occur and automatically log them.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-gray-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-2 group">
            <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
              📊
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Actionable Insights</h3>
            <p className="text-gray-500 leading-relaxed">
              Generate PDF reports, track compliance trends over time, and resolve incidents directly within our powerful management dashboard.
            </p>
          </div>
        </div>

        {/* ── Workflow Steps ── */}
        <div className="bg-slate-900 rounded-[2.5rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
          
          <h2 className="text-3xl md:text-4xl font-extrabold mb-12 text-center relative z-10">How SafetySnap Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-2xl font-bold text-teal-400 mb-6 shadow-inner">1</div>
              <h3 className="text-xl font-bold mb-4 text-white">Capture</h3>
              <p className="text-slate-400 leading-relaxed">Upload site photos or use the live monitor stream to capture high-resolution imagery of the work environment.</p>
            </div>
            <div className="text-center relative">
              <div className="hidden md:block absolute top-8 -left-6 w-12 h-[2px] bg-gradient-to-r from-transparent to-slate-700" />
              <div className="hidden md:block absolute top-8 -right-6 w-12 h-[2px] bg-gradient-to-r from-slate-700 to-transparent" />
              <div className="w-16 h-16 mx-auto bg-emerald-600 border border-emerald-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-6 shadow-[0_0_20px_rgb(16,185,129,0.5)]">2</div>
              <h3 className="text-xl font-bold mb-4 text-white">Analyze</h3>
              <p className="text-slate-400 leading-relaxed">Our dual-AI architecture uses Roboflow for object detection and Gemini for humanized contextual analysis.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-2xl font-bold text-cyan-400 mb-6 shadow-inner">3</div>
              <h3 className="text-xl font-bold mb-4 text-white">Report</h3>
              <p className="text-slate-400 leading-relaxed">Managers receive critical email alerts, view detailed bounding boxes, and export PDF compliance reports.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;
