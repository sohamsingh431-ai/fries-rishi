import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  Upload,
  Search,
  Mail,
  Globe,
  DollarSign,
  AlertCircle,
  ChevronRight,
  Fingerprint,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  MessageSquare,
  Settings,
  Bell,
  User,
  Paperclip,
  Mic,
  Send,
  Sparkles,
  Quote,
  Trash2,
  FileText,
  Activity,
  Menu,
  X,
  Smartphone,
  ScanSearch,
  Lock,
  History,
  Building2,
  TrendingDown,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const API_BASE_URL = 'http://localhost:8000';

const INITIAL_MESSAGES = [];

const App = () => {
  const [activeTab, setActiveTab] = useState('investigation'); // 'investigation', 'email', 'salary', 'company'
  const [conversations, setConversations] = useState([
    { id: Date.now(), title: 'Chat 1', messages: [...INITIAL_MESSAGES], formData: { job_url: '', company_claimed: '', recruiter_email: '', salary_offered: '', offer_text: '' } }
  ]);
  const [activeConvId, setActiveConvId] = useState(conversations[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];
  const messages = activeConv.messages;
  const formData = activeConv.formData;

  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userInput, setUserInput] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnalyzing, isExtracting]);

  const updateActiveConv = (updates) => {
    setConversations(prev => prev.map(c =>
      c.id === activeConvId ? { ...c, ...updates } : c
    ));
  };

  const handleNewInvestigation = () => {
    const newId = Date.now();
    const newConv = {
      id: newId,
      title: `Chat ${conversations.length + 1}`,
      messages: [...INITIAL_MESSAGES],
      formData: { job_url: '', company_claimed: '', recruiter_email: '', salary_offered: '', offer_text: '' }
    };
    setConversations(prev => [...prev, newConv]);
    setActiveConvId(newId);
    setActiveTab('investigation');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleDeleteConversation = (e, id) => {
    e.stopPropagation();
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (id === activeConvId) {
        if (filtered.length > 0) setActiveConvId(filtered[0].id);
        else {
          const freshId = Date.now();
          const freshConv = {
            id: freshId, title: 'Chat 1', messages: [...INITIAL_MESSAGES],
            formData: { job_url: '', company_claimed: '', recruiter_email: '', salary_offered: '', offer_text: '' }
          };
          setActiveConvId(freshId);
          return [freshConv];
        }
      }
      return filtered;
    });
  };

  const extractTextFromPDF = async (file) => {
    setIsExtracting(true);
    const userMsg = {
      role: 'user', type: 'pdf', content: file.name, fileSize: (file.size / 1024).toFixed(1) + ' KB',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    updateActiveConv({ messages: [...messages, userMsg] });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
      }
      const aiMsg = {
        role: 'ai', type: 'text',
        content: `Document integrity verified. I've extracted ${fullText.length} characters of forensic data from "${file.name}". Please provide the Recruiter's Official Email or Company Domain to calibrate the Typosquatting and MX-records modules.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      updateActiveConv({ formData: { ...formData, offer_text: fullText }, messages: [...messages, userMsg, aiMsg] });
    } catch (err) {
      updateActiveConv({ messages: [...messages, userMsg, { role: 'ai', type: 'text', content: "ERROR: Signal noise detected in PDF buffer.", timestamp: 'EXCEPTION' }] });
    } finally { setIsExtracting(false); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') extractTextFromPDF(file);
  };

  const handleSend = () => {
    if (!userInput.trim()) return;
    const text = userInput.trim();
    const userMsg = {
      role: 'user', type: 'text', content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    let newFormData = { ...formData };
    if (text.startsWith('http')) newFormData.job_url = text;
    else if (text.includes('@')) newFormData.recruiter_email = text;
    else if (!formData.company_claimed) newFormData.company_claimed = text;
    updateActiveConv({ messages: [...messages, userMsg], formData: newFormData });
    setUserInput('');
    setTimeout(() => {
      if (newFormData.offer_text || text.startsWith('http')) {
        (async () => {
          setIsAnalyzing(true);
          try {
            const response = await axios.post(`${API_BASE_URL}/api/check`, newFormData);
            const reportMsg = { role: 'ai', type: 'report', data: response.data, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
            updateActiveConv({ messages: [...messages, userMsg, reportMsg], formData: newFormData });
          } catch (err) {
            updateActiveConv({ messages: [...messages, userMsg, { role: 'ai', type: 'text', content: "Investigation stalled. Backend unreachable.", timestamp: 'ERROR' }], formData: newFormData });
          } finally { setIsAnalyzing(false); }
        })();
      }
    }, 500);
  };

  const getVerdictStyles = (verdict) => {
    switch (verdict) {
      case 'VERIFIED': return { color: 'text-emerald-500', bg: 'bg-emerald-50', icon: ShieldCheck };
      case 'UNVERIFIED': return { color: 'text-blue-500', bg: 'bg-blue-50', icon: ShieldQuestion };
      case 'SUSPICIOUS': return { color: 'text-amber-500', bg: 'bg-amber-50', icon: ShieldAlert };
      case 'SCAM': return { color: 'text-rose-500', bg: 'bg-rose-50', icon: ShieldX };
      default: return { color: 'text-slate-500', bg: 'bg-slate-50', icon: Search };
    }
  };

  return (
    <div className={`flex h-screen font-sans antialiased overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#020617] text-slate-200 selection:bg-violet-500/30' : 'bg-[#f3f4f6] text-[#374151] selection:bg-blue-100'}`}>



      <main className={`flex-1 flex flex-col relative min-w-0 transition-colors duration-300 ${isDarkMode ? 'bg-[#020617]' : 'bg-[#f9fafb]'}`}>
        <header className={`h-[80px] px-6 lg:px-8 flex items-center justify-center z-10 sticky top-0 transition-all duration-300 ${isDarkMode ? 'bg-[#020617]' : 'bg-[#f9fafb]'}`}>
          <div className={`flex items-center p-1.5 rounded-full border transition-all duration-300 shadow-xl backdrop-blur-xl ${isDarkMode ? 'bg-[#0b1120]/60 border-white/5 shadow-black/40' : 'bg-white/70 border-white/40 shadow-blue-500/5'}`}>
            <nav className="flex items-center gap-1 h-full">
              <button onClick={() => setActiveTab('investigation')} className={`text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-full transition-all ${activeTab === 'investigation' ? (isDarkMode ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-[#2563eb] text-white shadow-lg shadow-blue-500/20') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-[#6b7280] hover:text-[#111827] hover:bg-gray-50')}`}>
                Job Url
              </button>
              <button onClick={() => setActiveTab('email')} className={`text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-full transition-all ${activeTab === 'email' ? (isDarkMode ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-[#2563eb] text-white shadow-lg shadow-blue-500/20') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-[#6b7280] hover:bg-gray-50')}`}>
                E-mail Audit
              </button>
              <button onClick={() => setActiveTab('salary')} className={`text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-full transition-all ${activeTab === 'salary' ? (isDarkMode ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-[#2563eb] text-white shadow-lg shadow-blue-500/20') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-[#6b7280] hover:bg-gray-50')}`}>
                Salary
              </button>
              <button onClick={() => setActiveTab('company')} className={`text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-full transition-all ${activeTab === 'company' ? (isDarkMode ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-[#2563eb] text-white shadow-lg shadow-blue-500/20') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-[#6b7280] hover:bg-gray-50')}`}>
                Company Name
              </button>
            </nav>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-smooth">
          {activeTab === 'investigation' ? (
            <div className="px-4 lg:px-10 py-10 space-y-12">
              <div className="max-w-[900px] mx-auto space-y-12 pb-20">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-violet-500/10 text-violet-400' : 'bg-blue-50 text-blue-500'}`}><ScanSearch size={32} /></div>
                    <div className="space-y-2"><h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>New Investigation</h2><p className={`max-w-sm text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#6b7280]'}`}>Upload a document or provide a job URL to begin your forensic analysis.</p></div>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`flex gap-4 lg:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-[36px] h-[36px] lg:w-[40px] lg:h-[40px] flex-shrink-0 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 mt-1 ${msg.role === 'ai'
                        ? (isDarkMode ? 'bg-violet-600 text-white shadow-violet-500/20' : 'bg-[#2563eb] text-white shadow-blue-500/20')
                        : (isDarkMode ? 'bg-[#1e293b] text-slate-300 shadow-black/20' : 'bg-[#111827] text-white shadow-slate-500/20')
                      }`}>
                      {msg.role === 'ai' ? <Sparkles size={18} fill="white" /> : <User size={18} />}
                    </div>
                    <div className={`flex-1 space-y-4 max-w-[90%] lg:max-w-[80%]`}>
                      {msg.type === 'text' ? (
                        <div className={`inline-block px-5 lg:px-6 py-3 lg:py-4 rounded-[24px] lg:rounded-3xl text-[14px] lg:text-[15px] leading-relaxed shadow-sm border transition-colors ${msg.role === 'user'
                            ? (isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 rounded-tr-none' : 'bg-[#f3f4f6] text-[#374151] border-[#e5e7eb] rounded-tr-none')
                            : (isDarkMode ? 'bg-[#111827]/50 backdrop-blur-sm text-slate-100 border-slate-800 rounded-tl-none' : 'bg-white text-[#1f2937] border-[#e5e7eb] rounded-tl-none')
                          }`}>
                          <p className="font-medium whitespace-pre-line">{msg.content}</p>
                        </div>
                      ) : msg.type === 'pdf' ? (
                        <div className={`border-2 rounded-2xl overflow-hidden p-4 flex items-center gap-4 max-w-sm shadow-sm transition-all ${isDarkMode ? 'bg-[#1e293b]/50 border-slate-800 backdrop-blur-sm' : 'bg-white border-[#e5e7eb]'}`}>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-500'}`}><FileText size={24} /></div>
                          <div className="flex-1 min-w-0"><p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>{msg.content}</p><p className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-[#9ca3af]'}`}>{msg.fileSize} • PDF DOCUMENT</p></div>
                        </div>
                      ) : (
                        <div className={`border-2 rounded-[32px] overflow-hidden shadow-2xl transition-all text-left ${isDarkMode ? 'bg-[#0b1120] border-slate-800 shadow-black' : 'bg-white border-[#e5e7eb] shadow-blue-500/5'}`}>
                          <div className="p-6 lg:p-10 space-y-8">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              <div className="space-y-1"><h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-[#9ca3af]'}`}>Forensic Verdict</h3><h2 className={`text-4xl font-display font-black tracking-tighter ${getVerdictStyles(msg.data.verdict).color.replace('500', isDarkMode ? '400' : '500')}`}>{msg.data.verdict}</h2></div>
                              <div className="relative w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center">
                                <div className={`absolute inset-0 border-4 rounded-full ${isDarkMode ? 'border-slate-800' : 'border-[#f3f4f6]'}`}></div>
                                <div className={`absolute inset-0 border-4 rounded-full ${getVerdictStyles(msg.data.verdict).color.replace('text', 'border').replace('500', isDarkMode ? '400' : '500')}`} style={{ clipPath: `polygon(50% 50%, 50% 0%, ${msg.data.score}% 0%, ${msg.data.score}% 100%, 0% 100%, 0% 0%)` }}></div>
                                <span className={`text-xl lg:text-2xl font-black ${getVerdictStyles(msg.data.verdict).color.replace('500', isDarkMode ? '400' : '500')}`}>{msg.data.score}</span>
                              </div>
                            </div>
                            <div className="space-y-5">
                              {msg.data.signals.map((sig, sidx) => (
                                <div key={sidx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border-2 transition-all hover:translate-x-1 shadow-sm gap-3 ${sig.flag
                                    ? (isDarkMode ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50/30 border-rose-100')
                                    : (isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#fbfcff] border-emerald-50')
                                  }`}>
                                  <div className="flex items-center gap-4"><div className={`p-2 rounded-lg ${sig.flag ? (isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-500') : (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-500')}`}>{sig.flag ? <XCircle size={18} /> : <CheckCircle2 size={18} />}</div><span className={`text-[14px] font-bold ${sig.flag ? (isDarkMode ? 'text-rose-200' : 'text-rose-900') : (isDarkMode ? 'text-slate-200' : 'text-[#374151]')}`}>{sig.reason}</span></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {(isExtracting || isAnalyzing) && (<div className="flex gap-6 animate-pulse"><div className={`w-[40px] h-[40px] rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-violet-600/20' : 'bg-[#2563eb]/20'}`}><Loader2 size={24} className={`animate-spin ${isDarkMode ? 'text-violet-500' : 'text-[#2563eb]'}`} /></div><div className={`border rounded-[24px] px-8 py-5 shadow-sm font-bold ${isDarkMode ? 'bg-[#1e293b]/50 border-slate-800 text-slate-400' : 'bg-white border-[#e5e7eb] text-gray-500'}`}>Alexandria is analyzing...</div></div>)}
                <div ref={messagesEndRef} />
              </div>
            </div>
          ) : activeTab === 'email' ? (
            <div className="px-4 lg:px-10 py-8 max-w-3xl mx-auto">
              <div className={`border-2 rounded-[24px] p-6 lg:p-8 space-y-8 shadow-sm transition-all ${isDarkMode ? 'bg-[#0b1120] border-slate-800' : 'bg-white border-[#e5e7eb]'}`}>
                <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}><Mail size={24} /></div><div className="space-y-0.5"><h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>E-mail Header Audit</h2><p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-[#6b7280]'}`}>Detect spoofing and identify mail origin.</p></div></div>
                <div className="space-y-3">
                  <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${isDarkMode ? 'text-slate-500' : 'text-[#9ca3af]'}`}>Paste Raw Headers</label>
                  <textarea placeholder="Paste full email headers..." className={`w-full h-48 border-2 rounded-2xl p-5 text-sm font-mono outline-none transition-all resize-none ${isDarkMode ? 'bg-[#020617] border-slate-800 text-slate-300 focus:border-violet-500' : 'bg-[#f9fafb] border-[#e5e7eb] focus:border-[#2563eb]'}`}></textarea>
                  <button className={`w-full h-14 rounded-xl font-black flex items-center justify-center gap-2.5 transition-all uppercase tracking-widest text-xs ${isDarkMode ? 'bg-white text-[#020617] hover:bg-slate-200' : 'bg-[#111827] text-white hover:bg-black'}`}><ScanSearch size={20} /> Audit Header Signals</button>
                </div>
              </div>
            </div>
          ) : activeTab === 'salary' ? (
            <div className="px-4 lg:px-10 py-8 max-w-3xl mx-auto">
              <div className={`border-2 rounded-[24px] p-6 lg:p-8 space-y-8 shadow-sm transition-all ${isDarkMode ? 'bg-[#0b1120] border-slate-800' : 'bg-white border-[#e5e7eb]'}`}>
                <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><DollarSign size={24} /></div><div className="space-y-0.5"><h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>Salary Calibration</h2><p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-[#6b7280]'}`}>Verify if compensation is realistic.</p></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${isDarkMode ? 'text-slate-500' : 'text-[#9ca3af]'}`}>Salary Offered</label>
                    <input type="text" placeholder="e.g. $12,000 / month" className={`w-full h-12 border-2 rounded-xl px-4 font-bold outline-none text-sm transition-all ${isDarkMode ? 'bg-[#020617] border-slate-800 text-slate-200 focus:border-violet-500' : 'bg-[#f9fafb] border-[#e5e7eb] focus:border-[#2563eb]'}`} />
                  </div>
                  <div className="space-y-3">
                    <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${isDarkMode ? 'text-slate-500' : 'text-[#9ca3af]'}`}>Job Role</label>
                    <input type="text" placeholder="e.g. Data Entry" className={`w-full h-12 border-2 rounded-xl px-4 font-bold outline-none text-sm transition-all ${isDarkMode ? 'bg-[#020617] border-slate-800 text-slate-200 focus:border-violet-500' : 'bg-[#f9fafb] border-[#e5e7eb] focus:border-[#2563eb]'}`} />
                  </div>
                </div>
                <button className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg uppercase tracking-widest text-xs ${isDarkMode ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-500/20' : 'bg-[#2563eb] text-white hover:bg-blue-700 shadow-blue-500/20'}`}><TrendingDown size={20} /> Check Anomaly Coefficient</button>
              </div>
            </div>
          ) : (
            <div className="px-4 lg:px-10 py-8 max-w-3xl mx-auto">
              <div className={`border-2 rounded-[24px] p-6 lg:p-8 space-y-8 shadow-sm transition-all ${isDarkMode ? 'bg-[#0b1120] border-slate-800' : 'bg-white border-[#e5e7eb]'}`}>
                <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}><Building2 size={24} /></div><div className="space-y-0.5"><h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>Company Verification</h2><p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-[#6b7280]'}`}>Verify legal existence and reputation.</p></div></div>
                <div className="space-y-5">
                  <div className="space-y-3">
                    <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${isDarkMode ? 'text-slate-500' : 'text-[#9ca3af]'}`}>Legal Entity Name</label>
                    <div className="relative">
                      <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500' : 'text-[#9ca3af]'}`} size={18} />
                      <input type="text" placeholder="Search official registry..." className={`w-full h-14 border-2 rounded-xl pl-12 pr-4 font-bold outline-none text-sm transition-all ${isDarkMode ? 'bg-[#020617] border-slate-800 text-slate-200 focus:border-violet-500' : 'bg-[#f9fafb] border-[#e5e7eb] focus:border-[#2563eb]'}`} />
                    </div>
                  </div>
                  <button className={`w-full h-14 rounded-xl font-black flex items-center justify-center gap-2.5 transition-all uppercase tracking-widest text-xs ${isDarkMode ? 'bg-white text-[#020617] hover:bg-slate-200' : 'bg-[#111827] text-white hover:bg-black'}`}><Search size={20} /> Cross-check Registries</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'investigation' && (
          <footer className={`px-4 lg:px-10 py-6 lg:py-10 border-t sticky bottom-0 transition-colors duration-300 ${isDarkMode ? 'bg-[#020617] border-slate-800' : 'bg-[#f9fafb] border-[#e5e7eb]'}`}>
            <div className={`max-w-[900px] mx-auto relative flex items-center group border-2 rounded-[24px] lg:rounded-[32px] pr-3 pl-4 lg:pl-8 py-2 transition-all ${isDarkMode ? 'bg-[#0b1120] border-slate-800' : 'bg-white border-[#e5e7eb]'}`}>
              <button onClick={() => fileInputRef.current?.click()} className={`p-3 transition-colors rounded-xl shrink-0 ${isDarkMode ? 'text-slate-500 hover:text-violet-400' : 'text-[#9ca3af] hover:text-[#2563eb]'}`}><Paperclip size={24} /></button>
              <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Inquire further..." className={`flex-1 bg-transparent border-none outline-none py-4 lg:py-5 px-3 lg:px-5 font-medium transition-colors ${isDarkMode ? 'text-slate-200 placeholder:text-slate-600' : 'placeholder:text-[#9ca3af]'}`} />
              <button onClick={handleSend} className={`w-[48px] h-[48px] lg:w-[60px] lg:h-[60px] text-white rounded-[18px] lg:rounded-[24px] flex items-center justify-center transition-all shrink-0 ${isDarkMode ? 'bg-violet-600 hover:bg-violet-500' : 'bg-[#111827] hover:bg-black'}`}><Send size={20} fill="white" /></button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
          </footer>
        )}
      </main>
    </div>
  );
};

export default App;
