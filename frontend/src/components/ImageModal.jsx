import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export const DETECTION_CONFIG = {
  helmet:    { color: '#16a34a', border: '3px solid #16a34a', icon: '⛑️' },
  vest:      { color: '#2563eb', border: '3px solid #2563eb', icon: '🦺' },
  no_helmet: { color: '#dc2626', border: '3px solid #dc2626', icon: '⚠️' },
  no_vest:   { color: '#ea580c', border: '3px solid #ea580c', icon: '⚠️' },
};

export function ComplianceBadge({ score, violationCount }) {
  if (score === null) return <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 999, background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>No PPE data</span>;
  if (violationCount > 0) {
    return <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 999, background: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>⚠️ {violationCount} Violation{violationCount > 1 ? 's' : ''}</span>;
  }
  return <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 999, background: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}>✅ Compliant</span>;
}

export default function ImageModal({ image, onClose, onDelete }) {
  const [lang, setLang] = useState('english');
  const [localImage, setLocalImage] = useState(image);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const { currentUser } = useAuth();
  const isManager = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin');

  useEffect(() => {
    // Pre-load voices to ensure they are available when needed
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playAudio = (text, languageCode) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any currently playing audio

    const speakText = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageCode;
      utterance.rate = 0.9; // Slightly slower for better comprehension
      
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        // Try to aggressively find a matching voice
        const targetLang = languageCode.split('-')[0]; // 'en' or 'hi'
        let voice = voices.find(v => v.lang === languageCode || v.lang.replace('_', '-') === languageCode);
        
        if (!voice) {
          voice = voices.find(v => v.lang.startsWith(targetLang));
        }
        if (!voice && targetLang === 'hi') {
          // Some systems name it 'Hindi' without proper lang tags
          voice = voices.find(v => v.name.toLowerCase().includes('hindi'));
        }
        
        if (voice) {
          utterance.voice = voice;
        } else if (targetLang === 'hi') {
          console.warn("No Hindi voice found on this system. Speech may be silent or mispronounced. Please install a Hindi TTS voice in your OS settings.");
        }
      }
      
      window.speechSynthesis.speak(utterance);
    };

    // If voices aren't loaded yet (common bug in Chrome/Windows), wait for them
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', speakText, { once: true });
      // Fallback in case the event never fires
      setTimeout(speakText, 1000); 
    } else {
      speakText();
    }
  };

  const handleResolve = async () => {
    if (!resolutionNote.trim()) return;
    try {
      setIsResolving(true);
      const token = localStorage.getItem('token');
      const res = await axios.put(`/api/images/${localImage.id}/resolve`, { resolutionNote }, {
        headers: { 'x-auth-token': token }
      });
      setLocalImage({ ...localImage, ...res.data.image });
    } catch (err) {
      console.error(err);
      alert('Failed to resolve image');
    } finally {
      setIsResolving(false);
    }
  };

  const detections = localImage.detections || [];
  const violations = detections.filter(d => d.label === 'no_helmet' || d.label === 'no_vest');
  const compliant  = detections.filter(d => d.label === 'helmet' || d.label === 'vest');
  const score      = detections.length > 0 ? Math.round((compliant.length / detections.length) * 100) : null;
  const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';

  const getImageUrl = (img) => {
    if (img.previewUrl) return img.previewUrl;
    if (img.filePath && img.filePath.startsWith('http')) return img.filePath;
    return `/uploads/${img.filePath}`;
  };

  const renderBoxes = () => detections.map((det, i) => {
    const cfg = DETECTION_CONFIG[det.label] || DETECTION_CONFIG.helmet;
    return (
      <div key={i} style={{
        position: 'absolute',
        left: `${det.bbox.x * 100}%`, top: `${det.bbox.y * 100}%`,
        width: `${det.bbox.width * 100}%`, height: `${det.bbox.height * 100}%`,
        border: cfg.border, boxSizing: 'border-box', pointerEvents: 'none', borderRadius: 4,
      }}>
        <div style={{
          position: 'absolute', top: '-26px', left: -2,
          background: cfg.color, color: '#fff',
          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 'bold', whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {cfg.icon} {det.label.replace('_', ' ')} {Math.round(det.confidence * 100)}%
        </div>
      </div>
    );
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div
        style={{
          background: '#fff', borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: 900, width: '100%', maxHeight: '90vh', overflowY: 'auto',
          animation: 'modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Image Analysis</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{new Date(image.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
              {image.siteName && <span style={{ fontSize: 11, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>📍 {image.siteName}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {score !== null && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score}%</span>
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Compliant</span>
              </div>
            )}
            <div style={{ width: 1, height: 32, background: '#e2e8f0' }}></div>
            {onDelete && (
              <button
                onClick={() => onDelete(image.id)}
                style={{
                  background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 10,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#fef2f2'; }}
              >
                Delete Image
              </button>
            )}
            <button onClick={onClose} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div style={{ padding: 28 }}>
          {/* Score bar */}
          {score !== null && (
            <div style={{ marginBottom: 24, padding: '16px 20px', borderRadius: 16, border: `1px solid ${violations.length > 0 ? '#fecaca' : '#bbf7d0'}`, background: violations.length > 0 ? '#fef2f2' : '#f0fdf4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: violations.length > 0 ? '#b91c1c' : '#15803d' }}>
                  {violations.length > 0 ? `⚠️ ${violations.length} Violations Detected` : '✅ Fully Compliant'}
                </span>
                <span style={{ fontWeight: 800, color: scoreColor }}>{score}% Score</span>
              </div>
              <div style={{ width: '100%', background: '#e2e8f0', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', transition: 'width 0.5s ease', width: `${score}%`, background: scoreColor }}/>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, fontWeight: 600 }}>
                <span style={{ color: '#16a34a' }}>✅ {compliant.length} compliant items</span>
                {violations.length > 0 && <span style={{ color: '#dc2626' }}>⚠️ {violations.length} violations</span>}
              </div>
            </div>
          )}

          {/* Image with bboxes */}
          <div style={{ position: 'relative', display: 'inline-block', width: '100%', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <img src={getImageUrl(localImage)} alt="Analysis" style={{ width: '100%', height: 'auto', display: 'block' }} />
            {renderBoxes()}
          </div>

          {/* Detection list */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Detected Items ({detections.length})</h3>
            
            {detections.length > 0 ? (
              <div style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {detections.map((det, i) => {
                  const cfg = DETECTION_CONFIG[det.label] || {};
                  const isV = det.label === 'no_helmet' || det.label === 'no_vest';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: `1px solid ${isV ? '#fecaca' : '#bbf7d0'}`, background: isV ? '#fef2f2' : '#f0fdf4' }}>
                      <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isV ? '#b91c1c' : '#15803d', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{det.label.replace('_', ' ')}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: isV ? '#dc2626' : '#16a34a' }}>{Math.round(det.confidence * 100)}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                The object detection model (Roboflow) could not detect any helmets or vests clearly in this specific image.
              </div>
            )}
          </div>

          {/* AI Analysis Report */}
          {image.aiAnalysis && (
            <div style={{ marginTop: 24, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ background: '#0f172a', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✨</span>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.02em' }}>Gemini AI Contextual Analysis</h3>
                </div>
                {image.aiAnalysisHindi && (
                  <div style={{ display: 'flex', background: '#1e293b', borderRadius: 8, padding: 4 }}>
                    <button onClick={() => setLang('english')} style={{ background: lang === 'english' ? '#3b82f6' : 'transparent', color: lang === 'english' ? '#fff' : '#94a3b8', border: 'none', padding: '4px 12px', fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s' }}>EN</button>
                    <button onClick={() => setLang('hindi')} style={{ background: lang === 'hindi' ? '#3b82f6' : 'transparent', color: lang === 'hindi' ? '#fff' : '#94a3b8', border: 'none', padding: '4px 12px', fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s' }}>हिंदी</button>
                  </div>
                )}
              </div>
              <div style={{ padding: '20px', position: 'relative' }}>
                <button
                  onClick={() => playAudio(lang === 'english' ? image.aiAnalysis : (image.aiAnalysisHindi || image.aiAnalysis), lang === 'english' ? 'en-US' : 'hi-IN')}
                  style={{ position: 'absolute', top: 16, right: 16, background: '#e0e7ff', color: '#4f46e5', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                  title="Listen to Suggestion"
                  onMouseOver={e => e.currentTarget.style.background = '#c7d2fe'}
                  onMouseOut={e => e.currentTarget.style.background = '#e0e7ff'}
                >
                  🔊
                </button>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-line', paddingRight: 40 }}>
                  {lang === 'english' ? image.aiAnalysis : (image.aiAnalysisHindi || image.aiAnalysis)}
                </p>
              </div>
            </div>
          )}

          {/* Resolution Workflow */}
          {violations.length > 0 && (
            <div style={{ marginTop: 24 }}>
              {localImage.resolved ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>✅</span>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', margin: 0 }}>Resolved by {localImage.resolvedBy}</h3>
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
                      {new Date(localImage.resolvedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>"{localImage.resolutionNote}"</p>
                </div>
              ) : isManager ? (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>Resolve Incident</h3>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Add a note (e.g. 'Provided worker with a helmet')"
                    style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, minHeight: 80, marginBottom: 12, outline: 'none' }}
                  />
                  <button
                    onClick={handleResolve}
                    disabled={isResolving || !resolutionNote.trim()}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: isResolving || !resolutionNote.trim() ? 'not-allowed' : 'pointer', opacity: isResolving || !resolutionNote.trim() ? 0.6 : 1 }}
                  >
                    {isResolving ? 'Saving...' : 'Mark as Resolved'}
                  </button>
                </div>
              ) : (
                <div style={{ background: '#fef2f2', border: '1px dashed #fecaca', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#ef4444', fontWeight: 600 }}>⚠️ Violation needs resolution by a Manager.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
