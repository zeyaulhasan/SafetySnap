import { useState } from 'react';

const LABEL_CONFIG = {
  helmet:    { icon: '⛑️', label: 'Hard Hat',       badgeClass: 'bg-yellow-400 text-black' },
  vest:      { icon: '🦺', label: 'Safety Vest',    badgeClass: 'bg-emerald-500 text-white' },
  no_helmet: { icon: '⚠️', label: 'No Hard Hat',    badgeClass: 'bg-red-500 text-white' },
  no_vest:   { icon: '⚠️', label: 'No Vest',        badgeClass: 'bg-orange-500 text-white' },
};

const ImageCard = ({ image }) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const compliant  = image.detections.filter(d => ['helmet', 'vest'].includes(d.label));
  const violations = image.detections.filter(d => ['no_helmet', 'no_vest'].includes(d.label));

  const uniqueCompliant  = [...new Set(compliant.map(d => d.label))];
  const uniqueViolations = [...new Set(violations.map(d => d.label))];

  const hasAny = image.detections.length > 0;
  const overallStatus = !hasAny
    ? 'unknown'
    : violations.length > 0
    ? 'violation'
    : 'compliant';

  return (
    <div className="card hover:shadow-lg transition-shadow overflow-hidden">
      {/* Image with status strip */}
      <div className="relative">
        <img
          src={`/uploads/${image.filePath}`}
          alt="Safety image"
          className="w-full h-48 object-cover"
        />

        {/* Compliance status strip */}
        <div className={`absolute bottom-0 left-0 right-0 px-3 py-1 text-xs font-semibold text-center ${
          overallStatus === 'compliant' ? 'bg-emerald-500/90 text-white' :
          overallStatus === 'violation' ? 'bg-red-500/90 text-white' :
          'bg-gray-600/70 text-white'
        }`}>
          {overallStatus === 'compliant' && '✅ Compliant'}
          {overallStatus === 'violation' && `⚠️ ${violations.length} Violation${violations.length > 1 ? 's' : ''}`}
          {overallStatus === 'unknown'   && '📷 No PPE Detected'}
        </div>

        {/* Badges top-right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {uniqueCompliant.map(label => {
            const cfg = LABEL_CONFIG[label];
            return (
              <span key={label} className={`${cfg.badgeClass} text-xs px-2 py-0.5 rounded-full flex items-center gap-1`}>
                {cfg.icon} {cfg.label}
              </span>
            );
          })}
          {uniqueViolations.map(label => {
            const cfg = LABEL_CONFIG[label];
            return (
              <span key={label} className={`${cfg.badgeClass} text-xs px-2 py-0.5 rounded-full flex items-center gap-1`}>
                {cfg.icon} {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Card body */}
      <div className="p-3">
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-400">{formatDate(image.createdAt)}</p>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-primary-500 hover:text-primary-700 text-xs font-medium"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>

        {showDetails && (
          <div className="mt-3 space-y-2">
            {image.detections.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No PPE detected in this image.</p>
            ) : (
              image.detections.map((det, i) => {
                const cfg = LABEL_CONFIG[det.label] || {};
                const isViolation = ['no_helmet', 'no_vest'].includes(det.label);
                return (
                  <div key={i} className={`flex items-center justify-between text-xs p-2 rounded-lg ${
                    isViolation ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>
                    <span>{cfg.icon} {cfg.label || det.label}</span>
                    <span className="font-bold">{Math.round(det.confidence * 100)}%</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCard;
