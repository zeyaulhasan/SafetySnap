import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import ImageModal from '../components/ImageModal';

const DETECTION_CONFIG = {
  helmet:    { color: '#10b981', border: '3px solid #10b981', icon: '⛑️' }, // emerald-500
  vest:      { color: '#3b82f6', border: '3px solid #3b82f6', icon: '🦺' }, // blue-500
  no_helmet: { color: '#ef4444', border: '3px solid #ef4444', icon: '⚠️' }, // red-500
  no_vest:   { color: '#f97316', border: '3px solid #f97316', icon: '⚠️' }, // orange-500
};

const LiveMonitor = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [detections, setDetections] = useState([]);
  const [latency, setLatency] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [snapshotResult, setSnapshotResult] = useState(null);
  const toast = useToast();

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        setIsActive(true);
      }
    } catch (err) {
      toast.error('Could not access camera. Please check permissions.');
      console.error(err);
    }
  };

  const stopStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsActive(false);
    setDetections([]);
  }, []);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    const startTime = Date.now();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/live/detect-frame', { image: base64Image }, {
        headers: { 'x-auth-token': token }
      });
      setDetections(res.data.detections || []);
      setLatency(Date.now() - startTime);
    } catch (err) {
      console.error('Frame processing error:', err);
      if (err.response?.status === 401) {
        stopStream();
        toast.error('Session expired.');
      }
    }
  }, [isActive, stopStream, toast]);

  const captureSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    setIsAnalyzing(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/live/analyze-snapshot', { image: base64Image }, {
        headers: { 'x-auth-token': token }
      });
      
      setSnapshotResult({
        ...res.data,
        previewUrl: base64Image
      });
    } catch (err) {
      console.error('Snapshot error:', err);
      toast.error('Failed to analyze snapshot.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(processFrame, 1500);
    }
    return () => clearInterval(interval);
  }, [isActive, processFrame]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const renderBoxes = () => detections.map((det, i) => {
    const cfg = DETECTION_CONFIG[det.label] || DETECTION_CONFIG.helmet;
    return (
      <div key={i} className="absolute pointer-events-none rounded box-border shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" style={{
        left: `${det.bbox.x * 100}%`, top: `${det.bbox.y * 100}%`,
        width: `${det.bbox.width * 100}%`, height: `${det.bbox.height * 100}%`,
        border: cfg.border
      }}>
        <div className="absolute -top-7 -left-0.5 text-white px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap shadow-md" style={{ background: cfg.color }}>
          {cfg.icon} {det.label.replace('_', ' ')} {Math.round(det.confidence * 100)}%
        </div>
      </div>
    );
  });

  const compliantCount = detections.filter(d => d.label === 'helmet' || d.label === 'vest').length;
  const violationCount = detections.filter(d => d.label === 'no_helmet' || d.label === 'no_vest').length;
  const hasData = detections.length > 0;

  return (
    <div className="max-w-6xl mx-auto pb-20 font-sans relative">
      
      {/* Background Orbs */}
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-[-1]" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 mt-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Live Monitor</h1>
            {isStreaming && (
              <span className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full text-xs font-bold border border-rose-100">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                LIVE REC
              </span>
            )}
          </div>
          <p className="text-slate-500 font-medium">Real-time PPE inference using your device camera.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {!isStreaming ? (
            <button 
              onClick={startStream} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-[0_4px_14px_rgb(5,150,105,0.3)] hover:shadow-[0_6px_20px_rgb(5,150,105,0.4)] transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              Start Camera
            </button>
          ) : (
            <>
              <button 
                onClick={captureSnapshot} 
                disabled={isAnalyzing} 
                className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_4px_14px_rgb(79,70,229,0.3)] transition-all flex items-center gap-2 ${isAnalyzing ? 'opacity-70 cursor-wait' : 'hover:-translate-y-0.5'}`}
              >
                {isAnalyzing ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Analyzing...</>
                ) : (
                  <>✨ Inspect Frame</>
                )}
              </button>
              
              <button 
                onClick={() => setIsActive(!isActive)} 
                className={`px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 text-white ${isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >
                {isActive ? '⏸ Pause AI' : '▶ Resume AI'}
              </button>
              
              <button 
                onClick={stopStream} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold border border-slate-200 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        
        {/* Video Player */}
        <div className="bg-slate-900 rounded-3xl overflow-hidden relative aspect-video flex items-center justify-center shadow-[0_20px_40px_rgb(0,0,0,0.12)] border border-slate-800">
          {!isStreaming && (
            <div className="text-center text-slate-500">
              <div className="text-5xl mb-4">📹</div>
              <p className="font-semibold text-lg">Camera is off</p>
            </div>
          )}
          
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
          />
          
          <canvas ref={canvasRef} className="hidden" />

          {/* Detections Overlay */}
          {isActive && renderBoxes()}
          
          {/* Status HUD */}
          {isActive && (
            <div className="absolute top-4 right-4 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 px-4 py-2 rounded-xl text-white text-xs font-bold flex gap-4 shadow-lg">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${latency > 1000 ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                Latency: <span className={latency > 1000 ? 'text-rose-300' : 'text-emerald-300'}>{latency}ms</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-slate-400">Detections:</span> {detections.length}
              </span>
            </div>
          )}
        </div>

        {/* Telemetry Panel */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit">
          <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            Live Telemetry
          </h3>
          
          {!isActive ? (
            <div className="text-center text-slate-400 py-12 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
              Start AI to view real-time stats
            </div>
          ) : (
            <>
              {/* Score Circular Indicator */}
              <div className="flex justify-center mb-8">
                <div className={`w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center bg-white shadow-sm transition-colors ${violationCount > 0 ? 'border-rose-500 text-rose-600' : hasData ? 'border-emerald-500 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>
                  {hasData ? (
                    <>
                      <span className="text-3xl font-extrabold text-slate-900">{Math.round((compliantCount / detections.length) * 100)}%</span>
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">Score</span>
                    </>
                  ) : (
                    <span className="text-sm font-bold">Scanning...</span>
                  )}
                </div>
              </div>

              {/* Status Bar */}
              <div className={`px-4 py-3 rounded-xl border flex items-center justify-between mb-6 shadow-sm ${violationCount > 0 ? 'bg-rose-50 border-rose-200' : hasData ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`font-bold text-sm ${violationCount > 0 ? 'text-rose-700' : hasData ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {violationCount > 0 ? `⚠️ ${violationCount} Violations` : hasData ? '✅ Site Compliant' : 'No subjects detected'}
                </span>
              </div>

              {/* List */}
              {hasData && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Current Frame Data</h4>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {detections.map((d, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                        <span className="text-sm font-semibold text-slate-600 capitalize flex items-center gap-2">
                          {DETECTION_CONFIG[d.label]?.icon} {d.label.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100 text-slate-700">
                          {Math.round(d.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {snapshotResult && (
        <ImageModal
          image={snapshotResult}
          onClose={() => setSnapshotResult(null)}
        />
      )}
    </div>
  );
};

export default LiveMonitor;
