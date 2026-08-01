
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, Shield, Copy, Check, Plus, Trash2, Edit3, Lock, LogOut, 
  Code, Layers, Cpu, ExternalLink, Sparkles, CheckCircle2, AlertCircle, X, Server
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function App() {
  const [icons, setIcons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('gallery');
  const [copiedCode, setCopiedCode] = useState(null);
  const [selectedIcon, setSelectedIcon] = useState(null);

  const [adminToken, setAdminToken] = useState(localStorage.getItem('glyph_admin_token') || '');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [newIconName, setNewIconName] = useState('');
  const [newIconCategory, setNewIconCategory] = useState('outline');
  const [newIconSvg, setNewIconSvg] = useState('');
  const [newIconTags, setNewIconTags] = useState('');
  const [uploadMessage, setUploadMessage] = useState({ type: '', text: '' });
  const [editingIconId, setEditingIconId] = useState(null);
  const [bulkJson, setBulkJson] = useState('');

  useEffect(() => {
    fetchIcons();
  }, [selectedCategory, searchQuery]);

  const fetchIcons = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      const res = await axios.get(`${BACKEND_URL}/api/icons`, { params });
      setIcons(res.data.icons || []);
    } catch (err) {
      console.error("Error fetching icons:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: adminEmailInput,
        password: adminPasswordInput
      });
      const token = res.data.access_token;
      setAdminToken(token);
      localStorage.setItem('glyph_admin_token', token);
      setActiveTab('admin');
      setAdminEmailInput('');
      setAdminPasswordInput('');
    } catch (err) {
      setLoginError(err.response?.data?.detail || "Invalid login credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken('');
    localStorage.removeItem('glyph_admin_token');
    setActiveTab('gallery');
  };
  const handleCreateIcon = async (e) => {
    e.preventDefault();
    setUploadMessage({ type: '', text: '' });
    try {
      const tagsArray = newIconTags ? newIconTags.split(',').map(t => t.trim()) : [];
      const payload = {
        name: newIconName.trim().toLowerCase(),
        category: newIconCategory,
        svg_code: newIconSvg.trim(),
        tags: tagsArray
      };

      if (editingIconId) {
        await axios.put(`${BACKEND_URL}/api/icons/${editingIconId}`, payload, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        setUploadMessage({ type: 'success', text: 'Icon updated successfully!' });
        setEditingIconId(null);
      } else {
        await axios.post(`${BACKEND_URL}/api/icons`, payload, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        setUploadMessage({ type: 'success', text: 'Icon uploaded successfully!' });
      }

      setNewIconName('');
      setNewIconSvg('');
      setNewIconTags('');
      fetchIcons();
    } catch (err) {
      setUploadMessage({ type: 'error', text: err.response?.data?.detail || 'Operation failed.' });
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    setUploadMessage({ type: '', text: '' });
    try {
      const parsed = JSON.parse(bulkJson);
      const res = await axios.post(`${BACKEND_URL}/api/icons/bulk`, { icons: parsed }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setUploadMessage({ type: 'success', text: `Bulk upload complete! Uploaded: ${res.data.uploaded.length}` });
      setBulkJson('');
      fetchIcons();
    } catch (err) {
      setUploadMessage({ type: 'error', text: err.response?.data?.detail || 'Invalid JSON format.' });
    }
  };

  const handleDeleteIcon = async (id) => {
    if (!window.confirm("Are you sure you want to delete this icon?")) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/icons/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      fetchIcons();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete failed');
    }
  };

  const handleEditClick = (icon) => {
    setEditingIconId(icon.id);
    setNewIconName(icon.name);
    setNewIconCategory(icon.category);
    setNewIconSvg(icon.svg_code);
    setNewIconTags(icon.tags ? icon.tags.join(', ') : '');
    setActiveTab('admin');
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('gallery')}>
            <div className="bg-gradient-to-tr from-indigo-500 to-pink-500 p-2.5 rounded-xl shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                GlyphCraft
              </span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                Pro Icon Library
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <button onClick={() => setActiveTab('gallery')} className={`transition-colors hover:text-indigo-400 ${activeTab === 'gallery' ? 'text-indigo-400' : 'text-slate-300'}`}>Icon Gallery</button>
            <button onClick={() => setActiveTab('frameworks')} className={`transition-colors hover:text-indigo-400 ${activeTab === 'frameworks' ? 'text-indigo-400' : 'text-slate-300'}`}>Connection Guides</button>
            <button onClick={() => setActiveTab('cdn')} className={`transition-colors hover:text-indigo-400 ${activeTab === 'cdn' ? 'text-indigo-400' : 'text-slate-300'}`}>CDN Endpoints</button>
          </nav>

          <div className="flex items-center space-x-3">
            {adminToken ? (
              <div className="flex items-center space-x-2">
                <button onClick={() => setActiveTab('admin')} className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-300'}`}>Admin Panel</button>
                <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition" title="Logout"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setActiveTab('login')} className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {activeTab === 'gallery' && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto space-y-4 py-6">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                Colorful & Outline Icons for Modern Apps
              </h1>
              <p className="text-slate-400 text-base sm:text-lg">
                Font Awesome style vector library with vibrant multi-color icons and crisp mono outlines.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search icons by name or tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
<div className="flex items-center bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                  <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>All</button>
                  <button onClick={() => setSelectedCategory('colorful')} className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedCategory === 'colorful' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Colorful</button>
                  <button onClick={() => setSelectedCategory('outline')} className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedCategory === 'outline' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Outline</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {icons.map((icon) => (
                <div
                  key={icon.id || icon.name}
                  onClick={() => setSelectedIcon(icon)}
                  className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 flex flex-col items-center justify-between transition cursor-pointer relative"
                >
                  <span className={`absolute top-2.5 right-2.5 text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${icon.category === 'colorful' ? 'bg-pink-500/20 text-pink-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                    {icon.category === 'colorful' ? 'Color' : 'Mono'}
                  </span>
                  <div className="w-12 h-12 my-3 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <div className={`w-10 h-10 flex items-center justify-center ${icon.category === 'colorful' ? 'colorful' : ''}`} dangerouslySetInnerHTML={{ __html: icon.svg_code }} />
                  </div>
                  <span className="text-xs font-medium text-slate-300 truncate w-full text-center mt-1">{icon.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'login' && !adminToken && (
          <div className="max-w-md mx-auto py-12">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <Lock className="w-12 h-12 text-indigo-400 mx-auto" />
                <h2 className="text-2xl font-bold text-white">Admin Portal Login</h2>
                <p className="text-sm text-slate-400">Sign in with administrator credentials</p>
              </div>
              {loginError && <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-xl">{loginError}</div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                />
                <button type="submit" disabled={loginLoading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium">
                  {loginLoading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        )}

{activeTab === 'admin' && adminToken && (
          <div className="max-w-5xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-white">Admin Control Center</h1>
            {uploadMessage.text && <div className="p-4 bg-emerald-500/10 text-emerald-300 rounded-xl">{uploadMessage.text}</div>}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">{editingIconId ? 'Edit Icon' : 'Upload Single Icon'}</h3>
              <form onSubmit={handleCreateIcon} className="space-y-4">
                <input
                  type="text"
                  placeholder="Icon Name (slug e.g. home)"
                  value={newIconName}
                  onChange={(e) => setNewIconName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"
                />
                <select value={newIconCategory} onChange={(e) => setNewIconCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white">
                  <option value="outline">Outline / Mono</option>
                  <option value="colorful">Colorful</option>
                </select>
                <textarea
                  rows={4}
                  placeholder="Raw SVG Code"
                  value={newIconSvg}
                  onChange={(e) => setNewIconSvg(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-indigo-200"
                />
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium">Save Icon</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}



  
