import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer
} from 'recharts';
import { useToast } from '../contexts/ToastContext';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const pct = (v) => `${Math.round(v ?? 0)}%`;

const scoreColor = (s) =>
  s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444'; // Emerald, Amber, Red

const scoreBg = (s) =>
  s >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';

const scoreBorder = (s) =>
  s >= 80 ? 'border-emerald-200' : s >= 50 ? 'border-amber-200' : 'border-rose-200';

// ─── Circular Gauge ───────────────────────────────────────────────────────────
function Gauge({ value, label, sublabel }) {
  const v     = Math.round(value ?? 0);
  const color = scoreColor(v);
  const data  = [{ v }, { v: 100 - v }];
  return (
    <div className="flex flex-col items-center min-w-[160px]">
      <div className="relative w-36 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={68}
              startAngle={90} endAngle={-270} dataKey="v" strokeWidth={0}>
              <Cell fill={color} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold leading-none" style={{ color }}>{pct(v)}</span>
          <span className="text-[10px] font-bold text-slate-400 mt-1 tracking-wider uppercase">Compliance</span>
        </div>
      </div>
      <p className="font-extrabold text-sm text-slate-800 mt-3">{label}</p>
      {sublabel && <p className="text-xs text-slate-500 font-medium mt-0.5">{sublabel}</p>}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accentColor, accentBg }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 flex items-start gap-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm border border-white/50 ${accentBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-extrabold text-slate-900 leading-tight">{value}</p>
        {sub && <div className="text-xs text-slate-500 mt-1 font-medium">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-extrabold text-slate-900 m-0">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-xs">
      {label && <p className="font-extrabold text-slate-900 mb-2">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="my-0.5" style={{ color: p.color }}>
          <span className="font-bold">{p.name}:</span> {p.value}
        </p>
      ))}
    </div>
  );
};

// ─── PDF Export ───────────────────────────────────────────────────────────────
async function exportPDF(analytics, dashboardRef, toast) {
  toast.info('Preparing PDF…', 8000);
  try {
    const { default: jsPDF }      = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, M = 16;

    // Header band
    pdf.setFillColor(5, 150, 105); // emerald-600
    pdf.roundedRect(0, 0, W, 42, 0, 0, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20); pdf.setFont(undefined, 'bold');
    pdf.text('SafetySnap — PPE Compliance Report', M, 17);
    pdf.setFontSize(10); pdf.setFont(undefined, 'normal');
    pdf.text(`Generated: ${new Date().toLocaleString()}   ·   Total images: ${analytics.totalImages}`, M, 28);

    // Summary table
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(13); pdf.setFont(undefined, 'bold');
    pdf.text('Compliance Summary', M, 56);
    const rows = [
      ['Helmet Compliance',  pct(analytics.helmetCompliance)],
      ['Vest Compliance',    pct(analytics.vestCompliance)],
      ['Total Violations',   String(analytics.totalViolations)],
      ['No-Helmet Events',   String(analytics.violationBreakdown?.no_helmet ?? 0)],
      ['No-Vest Events',     String(analytics.violationBreakdown?.no_vest   ?? 0)],
      ['Workers Detected',   String(analytics.totalWorkersDetected)],
    ];
    pdf.setFontSize(10); pdf.setFont(undefined, 'normal');
    rows.forEach(([k, v], i) => {
      const c = i % 2 === 0 ? M : M + 95;
      const r = 66 + Math.floor(i / 2) * 10;
      pdf.text(`${k}: `, c, r);
      pdf.setFont(undefined, 'bold'); pdf.text(v, c + 50, r); pdf.setFont(undefined, 'normal');
    });

    const wc = analytics.weeklyComparison || {};
    pdf.text(`Weekly trend: ${wc.thisWeek ?? 0} this week vs ${wc.lastWeek ?? 0} last week`, M, 96);

    // Dashboard capture (using a solid background color so html2canvas captures it well)
    if (dashboardRef.current) {
      const canvas = await html2canvas(dashboardRef.current, { scale: 1.4, useCORS: true, backgroundColor: '#f8fafc' });
      const imgH   = (canvas.height / canvas.width) * (W - 2 * M);
      pdf.addPage();
      pdf.setFontSize(13); pdf.setFont(undefined, 'bold');
      pdf.text('Analytics Dashboard', M, 15);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', M, 22, W - 2 * M, Math.min(imgH, 240));
    }

    pdf.save(`SafetySnap_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF downloaded successfully!');
  } catch (e) {
    console.error(e);
    toast.error('Failed to generate PDF.');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const toast        = useToast();
  const dashboardRef = useRef(null);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res   = await axios.get('/api/analytics/summary', { headers: { 'x-auth-token': token } });
        setData(res.data);
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePDF = async () => {
    if (exporting || !data) return;
    setExporting(true);
    await exportPDF(data, dashboardRef, toast);
    setExporting(false);
  };

  const handleCSV = () => {
    if (!data) return;
    try {
      let csv = 'Type,Name,Metric 1,Metric 2\n';
      
      // Summary Stats
      csv += `Summary,Helmet Compliance,${Math.round(data.helmetCompliance)}%,\n`;
      csv += `Summary,Vest Compliance,${Math.round(data.vestCompliance)}%,\n`;
      csv += `Summary,Total Violations,${data.totalViolations},\n`;
      csv += `Summary,Workers Detected,${data.totalWorkersDetected},\n\n`;

      // Site Breakdown
      csv += 'Site Data,Site Name,Total Images,Violations\n';
      data.sites.forEach(s => {
        csv += `Site,${s.name.replace(',', '')},${s.total},${s.violations}\n`;
      });
      csv += '\n';

      // Daily Trends
      csv += 'Trend Data,Date,Violations,Compliance\n';
      data.dailyTrend.forEach(d => {
        const avgComp = (d.helmetCompliance + d.vestCompliance) / 2;
        csv += `Trend,${d.date},${d.violations},${Math.round(avgComp)}%\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `SafetySnap_Analytics_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('CSV exported successfully!');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  // ── Loading ──
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      <p className="text-slate-500 font-semibold text-lg">Loading analytics…</p>
    </div>
  );

  // ── Empty ──
  if (!data || data.totalImages === 0) return (
    <div className="max-w-4xl mx-auto pb-20 relative">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-8 mt-8 tracking-tight">Safety Analytics</h1>
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] py-24 px-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">📊</div>
        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">No data yet</h3>
        <p className="text-slate-500 text-base font-medium">Upload and analyze some images to see your compliance dashboard.</p>
      </div>
    </div>
  );

  const {
    helmetCompliance, vestCompliance, totalImages, totalViolations,
    violationBreakdown, totalWorkersDetected, dailyTrend, sites,
    bestImage, worstImage, weeklyComparison,
  } = data;

  const wc       = weeklyComparison || {};
  const wkDelta  = (wc.thisWeek ?? 0) - (wc.lastWeek ?? 0);
  const wkLabel  = wkDelta < 0 ? `↓ ${Math.abs(wkDelta)} fewer this week` : wkDelta > 0 ? `↑ ${wkDelta} more this week` : '→ Same as last week';
  const wkStyle  = wkDelta < 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : wkDelta > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-600 bg-slate-100 border-slate-200';

  const overallScore = totalImages > 0 ? Math.round(((helmetCompliance + vestCompliance) / 2)) : 0;

  const violationData = [
    { name: 'No Helmet', count: violationBreakdown?.no_helmet ?? 0 },
    { name: 'No Vest',   count: violationBreakdown?.no_vest   ?? 0 },
  ];

  const siteData = (sites || []).slice(0, 8).map(s => ({
    name:       s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
    Images:     s.total,
    Violations: s.violations,
  }));

  const trendData = (dailyTrend || []).map(d => ({
    date:         d.date?.slice(5),
    'Violations': d.violations,
    'Helmet %':   Math.round(d.helmetCompliance),
    'Vest %':     Math.round(d.vestCompliance),
  }));

  return (
    <div className="max-w-[1200px] mx-auto pb-20 font-sans relative">

      {/* Background Orbs */}
      <div className="absolute top-[5%] left-[-5%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-[-1]" />
      <div className="absolute top-[25%] right-[-5%] w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none z-[-1]" />

      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 mt-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 m-0 tracking-tight">Safety Analytics</h1>
          <p className="text-slate-500 text-base mt-2 font-medium">
            Based on <strong className="text-emerald-600">{totalImages}</strong> analyzed image{totalImages !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Export CSV
          </button>
          <button 
            onClick={handlePDF}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-[0_4px_12px_rgba(5,150,105,0.2)] disabled:opacity-50"
          >
            {exporting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            )}
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* ── Dashboard Content ── */}
      <div ref={dashboardRef} className="bg-slate-50/50 rounded-3xl p-1 md:p-2">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <KpiCard icon="📸" label="Images Analyzed" value={totalImages} sub="total uploads" accentBg="bg-teal-50 text-teal-600" />
          <KpiCard icon="🚨" label="Total Violations" value={totalViolations} sub="detected across all" accentBg="bg-rose-50 text-rose-600" />
          <KpiCard icon="👷" label="Workers Detected" value={totalWorkersDetected} sub="estimated persons" accentBg="bg-indigo-50 text-indigo-600" />
          <KpiCard icon="📅" label="This Week" 
            value={`${wc.thisWeek ?? 0} violations`} 
            sub={<span className={`inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-bold border ${wkStyle}`}>{wkLabel}</span>} 
            accentBg="bg-amber-50 text-amber-600" 
          />
        </div>

        {/* ── Compliance gauges ── */}
        <Section title="Compliance Rate">
          <div className="flex justify-around flex-wrap gap-8 pt-2">
            <Gauge value={helmetCompliance} label="Helmet Compliance" sublabel={`${Math.round(helmetCompliance)}% of images`} />
            <Gauge value={vestCompliance} label="Vest Compliance" sublabel={`${Math.round(vestCompliance)}% of images`} />
            <Gauge value={overallScore} label="Overall Safety Score" sublabel="average of both" />
          </div>
        </Section>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Violation breakdown */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
            <h2 className="text-lg font-extrabold text-slate-900 mb-6">Violation Breakdown</h2>
            {violationData.every(d => d.count === 0) ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-slate-400">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-sm font-bold">No violations recorded</p>
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={violationData} margin={{ top: 0, right: 10, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" name="Count" radius={[8, 8, 0, 0]}>
                      <Cell fill="#f43f5e" /> {/* rose-500 */}
                      <Cell fill="#f97316" /> {/* orange-500 */}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 14-day trend */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
            <h2 className="text-lg font-extrabold text-slate-900 mb-6">14-Day Trend</h2>
            {trendData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm font-bold">
                No trend data yet
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 10 }} />
                    <Line type="monotone" dataKey="Violations" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="Helmet %" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
                    <Line type="monotone" dataKey="Vest %" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── Site breakdown ── */}
        {siteData.length > 0 && (
          <Section title="Site Breakdown">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteData} margin={{ top: 0, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 10 }} />
                  <Bar dataKey="Images" fill="#38bdf8" radius={[6, 6, 0, 0]} /> {/* sky-400 */}
                  <Bar dataKey="Violations" fill="#fb7185" radius={[6, 6, 0, 0]} /> {/* rose-400 */}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}

        {/* ── Risk Profile ── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-6">
          <h2 className="text-lg font-extrabold text-slate-900 mb-6">Risk Profile Highlights</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Best */}
            {[
              { img: bestImage,  label: 'Safest Upload',       borderCls: 'border-emerald-200', bgCls: 'bg-emerald-50/50', accentText: 'text-emerald-600', emoji: '🏆' },
              { img: worstImage, label: 'Highest Risk Upload', borderCls: 'border-rose-200', bgCls: 'bg-rose-50/50', accentText: 'text-rose-600', emoji: '⚠️' },
            ].map(({ img, label, borderCls, bgCls, accentText, emoji }) => (
              <div key={label} className={`border ${borderCls} ${bgCls} rounded-2xl p-5 flex flex-col`}>
                <p className={`text-[11px] font-extrabold uppercase tracking-widest mb-4 flex items-center gap-1.5 ${accentText}`}>
                  <span className="text-sm">{emoji}</span> {label}
                </p>
                {img ? (
                  <div className="flex items-center gap-5">
                    <img
                      src={img.filePath.startsWith('http') ? img.filePath : `/uploads/${img.filePath}`}
                      alt={label}
                      className={`w-24 h-20 object-cover rounded-xl border-2 ${borderCls} shadow-sm shrink-0 bg-white`}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div>
                      <p className={`text-4xl font-black leading-none ${accentText}`}>{img.score}%</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1.5">Compliance Score</p>
                      {img.siteName && <p className="text-xs font-bold text-slate-600 mt-2 bg-white px-2 py-1 rounded-md inline-block shadow-sm">📍 {img.siteName}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-400 flex-1 flex items-center">No data yet</p>
                )}
              </div>
            ))}
          </div>

          {/* Week-over-week bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Week-over-Week Violations</p>
            <div className="flex items-center gap-2">
              <div className="text-center min-w-[80px]">
                <p className="text-3xl font-black text-slate-900">{wc.thisWeek ?? 0}</p>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">This Week</p>
              </div>
              
              <div className="flex-1 px-4 md:px-8">
                <div className="h-2 bg-slate-200 rounded-full relative overflow-visible">
                  <div className="absolute right-[-2px] top-[-3px] w-0 h-0 border-y-4 border-y-transparent border-l-[6px] border-l-slate-300"></div>
                </div>
              </div>
              
              <div className="text-center min-w-[80px]">
                <p className="text-3xl font-black text-slate-400">{wc.lastWeek ?? 0}</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Last Week</p>
              </div>
              
              <div className="ml-auto pl-4">
                <span className={`inline-block px-4 py-2 rounded-xl text-xs font-bold border shadow-sm ${wkStyle}`}>
                  {wkLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
