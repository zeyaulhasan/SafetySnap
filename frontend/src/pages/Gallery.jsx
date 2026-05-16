import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import ImageModal, { ComplianceBadge } from '../components/ImageModal';

const Gallery = () => {
  const toast = useToast();
  const [images, setImages]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [siteList, setSiteList]   = useState([]);
  const [filters, setFilters]     = useState({ label: '', from: '', to: '', site: '', sort: 'newest' });

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const token  = localStorage.getItem('token');
      const params = new URLSearchParams({ page, limit: 12, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
      const res    = await axios.get(`/api/images?${params}`, { headers: { 'x-auth-token': token } });
      const imgs   = res.data.images || [];
      setImages(imgs);
      setTotalPages(res.data.pagination.pages || 1);
      // Collect unique site names
      const sites = [...new Set(imgs.map(i => i.siteName).filter(Boolean))];
      setSiteList(prev => [...new Set([...prev, ...sites])]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching images');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/images/${id}`, { headers: { 'x-auth-token': token } });
      setImages(prev => prev.filter(img => img.id !== id));
      setSelectedImage(null);
      setDeleteConfirm(null);
      toast.success('Image deleted successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete image.');
    }
  };

  const requestDelete = (id) => {
    setDeleteConfirm(id);
    setSelectedImage(null);
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-20 font-sans relative">
      {/* Background Orbs */}
      <div className="absolute top-[10%] right-[-5%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none z-[-1]" />
      
      {/* Header */}
      <div className="mb-10 mt-8">
        <h1 className="text-4xl font-extrabold text-slate-900 m-0 tracking-tight">Image Gallery</h1>
        <p className="text-slate-500 text-base mt-2">
          Browse, filter, and review {images.length > 0 ? 'your processed' : ''} safety images.
        </p>
      </div>

      {/* Filters bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {/* Sort */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Sort By</label>
            <select name="sort" value={filters.sort} onChange={handleFilterChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all">
              <option value="newest">Newest First</option>
              <option value="most_violations">Most Violations</option>
              <option value="highest_compliance">Highest Compliance</option>
            </select>
          </div>
          {/* PPE filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">PPE Filter</label>
            <select name="label" value={filters.label} onChange={handleFilterChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all">
              <option value="">All Items</option>
              <option value="helmet">✅ Helmet</option>
              <option value="vest">✅ Vest</option>
              <option value="no_helmet">⚠️ No Helmet</option>
              <option value="no_vest">⚠️ No Vest</option>
            </select>
          </div>
          {/* Site filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Site / Location</label>
            <select name="site" value={filters.site} onChange={handleFilterChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all">
              <option value="">All Sites</option>
              {siteList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Date from */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">From Date</label>
            <input type="date" name="from" value={filters.from} onChange={handleFilterChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"/>
          </div>
          {/* Date to */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">To Date</label>
            <input type="date" name="to" value={filters.to} onChange={handleFilterChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"/>
          </div>
          {/* Clear */}
          <div className="flex items-end">
            <button
              onClick={() => { setFilters({ label: '', from: '', to: '', site: '', sort: 'newest' }); setPage(1); }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-200 hover:text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-[0_20px_40px_rgb(0,0,0,0.2)] animate-[modalPop_0.2s_ease-out]">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl text-rose-500 mb-6 shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">Delete Image?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">This action cannot be undone. It will be permanently removed from analytics.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-[0_4px_14px_rgb(225,29,72,0.3)] transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-center py-32">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-slate-500 font-semibold text-lg">Loading gallery...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] py-24 px-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6 text-slate-400 text-4xl shadow-inner">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mb-2">No images found</h3>
          <p className="text-slate-500 text-base">Try adjusting your filters or upload some new images.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-12">
            {images.map(image => {
              const violations = (image.detections || []).filter(d => d.label === 'no_helmet' || d.label === 'no_vest').length;
              const isViolation = violations > 0;
              const hasData = image.detections?.length > 0;
              
              return (
                <div
                  key={image.id}
                  className={`bg-white rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 border flex flex-col group hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] ${isViolation ? 'border-rose-200' : hasData ? 'border-emerald-200' : 'border-slate-200'}`}
                  onClick={() => setSelectedImage(image)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-slate-100 border-b border-slate-100 overflow-hidden">
                    <img
                      src={image.filePath.startsWith('http') ? image.filePath : `/uploads/${image.filePath}`}
                      alt="Site"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={e => { e.target.src = 'https://via.placeholder.com/400x200?text=Image+Not+Found'; }}
                    />
                    {/* Overlay Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {isViolation && (
                        <div className="bg-rose-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md backdrop-blur-md">
                          ⚠️ {violations} Violation{violations > 1 ? 's' : ''}
                        </div>
                      )}
                      {!isViolation && hasData && (
                        <div className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md backdrop-blur-md">
                          ✅ Compliant
                        </div>
                      )}
                    </div>
                    {image.complianceScore !== null && hasData && (
                      <div className="absolute top-3 right-3 bg-slate-900/80 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-full backdrop-blur-md shadow-md border border-slate-700/50">
                        {image.complianceScore}%
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <ComplianceBadge score={image.complianceScore} violationCount={violations} />
                      <button
                        onClick={e => { e.stopPropagation(); requestDelete(image.id); }}
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all"
                        title="Delete image"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="mt-auto">
                      {image.siteName && (
                        <p className="text-xs font-bold text-emerald-600 mb-1.5 truncate">📍 {image.siteName}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-medium text-slate-500">
                          {new Date(image.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                          {(image.detections || []).length} item{(image.detections || []).length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setPage(p => Math.max(p - 1, 1))} 
                disabled={page === 1}
                className={`px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold shadow-sm transition-all hover:bg-slate-50 hover:shadow-md ${page === 1 ? 'opacity-50 cursor-not-allowed hover:translate-y-0' : 'hover:-translate-y-0.5'}`}
              >
                ← Previous
              </button>
              <div className="px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-sm font-extrabold flex items-center justify-center min-w-[120px]">
                Page {page} of {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(p + 1, totalPages))} 
                disabled={page === totalPages}
                className={`px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold shadow-sm transition-all hover:bg-slate-50 hover:shadow-md ${page === totalPages ? 'opacity-50 cursor-not-allowed hover:translate-y-0' : 'hover:-translate-y-0.5'}`}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Image modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onDelete={requestDelete}
        />
      )}
      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Gallery;
