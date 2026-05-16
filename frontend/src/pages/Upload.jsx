import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import ImageModal from '../components/ImageModal';
import { useAuth } from '../contexts/AuthContext';

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [siteName, setSiteName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const isManager = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin');

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      const type = file.type;
      return type === 'image/jpeg' || type === 'image/png' || type === 'image/webp';
    });
    if (validFiles.length !== newFiles.length) {
      toast.error('Only JPEG, PNG, and WebP files are supported by the AI.');
    }
    
    const newFileObjects = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      result: null
    }));

    setFiles(prev => [...prev, ...newFileObjects]);
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  const removeFile = (id) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target && target.preview) URL.revokeObjectURL(target.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) return toast.error('Please select at least one image.');
    if (!siteName.trim()) return toast.error('Please enter a site name.');

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const fileObj = files[i];
      if (fileObj.status === 'success') continue;

      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading', progress: 10 } : f));

      const formData = new FormData();
      formData.append('image', fileObj.file);
      formData.append('siteName', siteName.trim());

      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/images/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-auth-token': token
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: Math.min(percentCompleted, 90) } : f));
          }
        });

        successCount++;
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'success', progress: 100, result: res.data.image } : f));
      } catch (err) {
        console.error('Upload error:', err);
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', progress: 0 } : f));
        toast.error(`Failed to upload ${fileObj.file.name}`);
      }
    }

    setIsUploading(false);
    if (successCount === files.filter(f => f.status !== 'success').length) {
      toast.success('All files uploaded successfully!');
    } else if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} files.`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 font-sans relative">
      
      {/* Background Orbs */}
      <div className="absolute top-[5%] left-[-5%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none z-[-1]" />
      <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none z-[-1]" />

      <div className="text-center mb-12 mt-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Batch Upload</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Upload multiple site photos at once. Our AI will process them securely and generate a compliance report.
        </p>
      </div>

      <div className="bg-white/70 backdrop-blur-xl border border-slate-200 rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-10">
        
        {/* Input fields */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-800 mb-2">
            Site / Location Tag <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="e.g. North Wing, Sector 4..."
            disabled={isUploading}
            className={`w-full px-5 py-4 rounded-xl border border-slate-200 text-slate-800 text-base outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${isUploading ? 'bg-slate-50' : 'bg-white'}`}
          />
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current.click()}
          className={`border-2 border-dashed rounded-[1.5rem] py-16 px-6 text-center transition-all ${
            isUploading 
              ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200' 
              : files.length > 0 
                ? 'bg-emerald-50/50 border-emerald-300 cursor-pointer hover:bg-emerald-50' 
                : 'bg-slate-50 border-slate-300 cursor-pointer hover:bg-slate-100 hover:border-emerald-300'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-5 shadow-[0_4px_14px_rgb(0,0,0,0.06)] text-emerald-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            Click or drag files here to upload
          </h3>
          <p className="text-slate-500 text-sm font-medium">Accepts high-res JPEG, PNG, and WebP.</p>
        </div>
      </div>

      {/* Upload Queue */}
      {files.length > 0 && (
        <div className="bg-white/70 backdrop-blur-xl border border-slate-200 rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h3 className="text-2xl font-extrabold text-slate-900 m-0">Upload Queue <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-lg">({files.length})</span></h3>
            <div className="flex gap-3">
              <button
                onClick={() => setFiles([])}
                disabled={isUploading}
                className={`px-5 py-2.5 rounded-xl bg-rose-50 text-rose-600 font-bold transition-all hover:bg-rose-100 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Clear All
              </button>
              <button
                onClick={uploadFiles}
                disabled={isUploading || files.every(f => f.status === 'success')}
                className={`px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold transition-all shadow-[0_4px_14px_rgb(5,150,105,0.3)] hover:bg-emerald-700 hover:shadow-[0_6px_20px_rgb(5,150,105,0.4)] hover:-translate-y-[1px] ${(isUploading || files.every(f => f.status === 'success')) ? 'opacity-50 cursor-not-allowed hover:translate-y-0' : ''}`}
              >
                {isUploading ? 'Processing...' : 'Upload Now'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {files.map((fileObj) => (
              <div 
                key={fileObj.id} 
                className={`border rounded-2xl p-4 flex gap-4 items-center transition-colors ${
                  fileObj.status === 'success' ? 'border-emerald-200 bg-emerald-50/50' 
                  : fileObj.status === 'error' ? 'border-rose-200 bg-rose-50' 
                  : 'border-slate-200 bg-white'
                }`}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 shadow-sm border border-slate-200/50">
                  <img src={fileObj.preview} alt="preview" className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 mb-1 truncate">
                    {fileObj.file.name}
                  </p>
                  
                  {/* Status indicator */}
                  {fileObj.status === 'pending' && <p className="text-xs text-slate-500 font-medium">Ready to upload</p>}
                  {fileObj.status === 'uploading' && (
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${fileObj.progress}%` }} />
                    </div>
                  )}
                  {fileObj.status === 'success' && <p className="text-xs text-emerald-600 font-bold flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg> Success</p>}
                  {fileObj.status === 'error' && <p className="text-xs text-rose-500 font-bold flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg> Failed</p>}
                </div>

                {!isUploading && fileObj.status !== 'success' && (
                  <button onClick={() => removeFile(fileObj.id)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center shrink-0 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                )}

                {fileObj.status === 'success' && (
                  <button 
                    onClick={() => setSelectedImage(fileObj.result)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0"
                  >
                    View
                  </button>
                )}
              </div>
            ))}
          </div>

          {isManager && files.every(f => f.status === 'success') && files.length > 0 && (
            <div className="text-center mt-10">
              <button 
                onClick={() => navigate('/gallery')} 
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg hover:-translate-y-1"
              >
                View in Gallery →
              </button>
            </div>
          )}
        </div>
      )}

      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

export default Upload;
