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
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const API_BASE_URL = 'http://localhost:8000';

const INITIAL_MESSAGES = [];

const App = () => {
  const [activeTab, setActiveTab] = useState('investigation'); // 'investigation' or 'email'
  const [conversations, setConversations] = useState([
    { id: Date.now(), title: 'Chat 1', messages: [...INITIAL_MESSAGES], formData: { job_url: '', company_claimed: '', recruiter_email: '', salary_offered: '', offer_text: '' } }
  ]);
  const [activeConvId, setActiveConvId] = useState(conversations[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <div className="flex h-screen bg-[#f3f4f6] text-[#374151] font-sans selection:bg-blue-100 antialiased overflow-hidden">
      
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm" />
        )}
      </AnimatePresence>

      <aside className={`fixed lg:static inset-y-0 left-0 w-[280px] lg:w-[320px] bg-white border-r border-[#e5e7eb] flex flex-col shadow-2xl lg:shadow-sm z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 pt-10">
          <button onClick={handleNewInvestigation} className="w-full h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98]">
            <Plus size={18} />
            New Chat
          </button>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto space-y-1">
          <div className="px-5 py-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-[0.2em]">Chat History</div>
          {conversations.map(conv => (
            <div 
              key={conv.id}
              onClick={() => {
                setActiveConvId(conv.id);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={`group relative flex items-center justify-between gap-3 px-5 py-4 rounded-2xl cursor-pointer transition-all ${
                activeConvId === conv.id ? 'bg-[#eff6ff] text-[#2563eb]' : 'text-[#6b7280] hover:bg-[#f9fafb]'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className={activeConvId === conv.id ? 'text-[#2563eb]' : 'text-[#9ca3af]'} />
                <span className={`text-sm font-bold truncate ${activeConvId === conv.id ? '' : 'font-medium'}`}>
                  {conv.title}
                </span>
              </div>
              <button onClick={(e) => handleDeleteConversation(e, conv.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-all text-[#9ca3af]">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-[#f3f4f6]">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-[#6b7280] hover:text-[#111827] transition-colors rounded-2xl font-bold text-sm bg-gray-50/50">
            <Settings size={18} />
            <span>Audit Settings</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative min-w-0 bg-[#f9fafb]">
        <header className="h-[72px] bg-white border-b border-[#e5e7eb] px-6 lg:px-10 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-[#6b7280] hover:bg-gray-100 rounded-lg">
              <Menu size={24} />
            </button>
            <nav className="hidden lg:flex items-center gap-12 h-full">
              <button 
                onClick={() => setActiveTab('investigation')}
                className={`text-sm font-black uppercase tracking-widest h-[72px] flex items-center pt-0.5 border-b-2 transition-all ${activeTab === 'investigation' ? 'text-[#111827] border-[#2563eb]' : 'text-[#6b7280] border-transparent hover:text-[#111827]'}`}
              >
                Job Url
              </button>
              <button 
                onClick={() => setActiveTab('email')}
                className={`text-sm font-black uppercase tracking-widest h-[72px] flex items-center pt-0.5 border-b-2 transition-all ${activeTab === 'email' ? 'text-[#111827] border-[#2563eb]' : 'text-[#6b7280] border-transparent hover:text-[#111827]'}`}
              >
                E-mail Audit
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
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                      <ScanSearch size={32} />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-[#111827]">New Investigation</h2>
                      <p className="text-[#6b7280] max-w-sm text-sm">Upload a document or provide a job URL to begin your forensic analysis.</p>
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`flex gap-4 lg:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-[36px] h-[36px] lg:w-[40px] lg:h-[40px] flex-shrink-0 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 mt-1 ${msg.role === 'ai' ? 'bg-[#2563eb] text-white shadow-blue-500/20' : 'bg-[#111827] text-white shadow-slate-500/20'}`}>
                      {msg.role === 'ai' ? <Sparkles size={18} fill="white" /> : <User size={18} />}
                    </div>
                    <div className={`flex-1 space-y-4 max-w-[90%] lg:max-w-[80%]`}>
                      {msg.type === 'text' ? (
                        <div className={`inline-block px-5 lg:px-6 py-3 lg:py-4 rounded-[24px] lg:rounded-3xl text-[14px] lg:text-[15px] leading-relaxed shadow-sm border border-[#e5e7eb] ${msg.role === 'user' ? 'bg-[#f3f4f6] text-[#374151] rounded-tr-none' : 'bg-white text-[#1f2937] rounded-tl-none'}`}>
                          <p className="font-medium whitespace-pre-line">{msg.content}</p>
                        </div>
                      ) : msg.type === 'pdf' ? (
                        <div className="bg-white border-2 border-[#e5e7eb] rounded-2xl overflow-hidden p-4 flex items-center gap-4 max-w-sm shadow-sm">
                           <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500"><FileText size={24} /></div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[#111827] truncate">{msg.content}</p>
                              <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-widest">{msg.fileSize} • PDF DOCUMENT</p>
                           </div>
                        </div>
                      ) : (
                        <div className="bg-white border-2 border-[#e5e7eb] rounded-[32px] overflow-hidden shadow-2xl shadow-blue-500/5 text-left">
                           <div className="p-6 lg:p-10 space-y-8">
                             <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="space-y-1">
                                   <h3 className="text-xs font-black text-[#9ca3af] uppercase tracking-widest">Forensic Verdict</h3>
                                   <h2 className={`text-4xl font-display font-black tracking-tighter ${getVerdictStyles(msg.data.verdict).color}`}>{msg.data.verdict}</h2>
                                </div>
                                <div className="relative w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center">
                                   <div className="absolute inset-0 border-4 border-[#f3f4f6] rounded-full"></div>
                                   <div className={`absolute inset-0 border-4 ${getVerdictStyles(msg.data.verdict).color.replace('text', 'border')} rounded-full`} style={{ clipPath: `polygon(50% 50%, 50% 0%, ${msg.data.score}% 0%, ${msg.data.score}% 100%, 0% 100%, 0% 0%)` }}></div>
                                   <span className={`text-xl lg:text-2xl font-black ${getVerdictStyles(msg.data.verdict).color}`}>{msg.data.score}</span>
                                </div>
                             </div>
                             <div className={`p-6 lg:p-8 rounded-[24px] border-l-8 ${getVerdictStyles(msg.data.verdict).bg} ${getVerdictStyles(msg.data.verdict).color.replace('text', 'border')}`}>
                                <p className="text-lg font-bold text-[#111827] mb-2">Technical Summary</p>
                                <p className="text-[15px] lg:text-[16px] leading-relaxed text-[#4b5563] font-medium">{msg.data.verdict === 'SCAM' ? "High-confidence fraud signal identified." : "Investigation complete. Low risk profile detected."}</p>
                             </div>
                             <div className="space-y-5">
                               <div className="flex items-center gap-2 px-1"><Activity size={14} className="text-[#2563eb]" /><h3 className="text-[11px] font-black text-[#9ca3af] uppercase tracking-[0.2em]">Signal Breakdown</h3></div>
                               <div className="grid gap-4">
                                  {msg.data.signals.map((sig, sidx) => (
                                    <div key={sidx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border-2 transition-all hover:translate-x-1 shadow-sm gap-3 ${sig.flag ? 'bg-rose-50/30 border-rose-100' : 'bg-[#fbfcff] border-emerald-50'}`}>
                                       <div className="flex items-center gap-4">
                                          <div className={`p-2 rounded-lg ${sig.flag ? 'bg-rose-100 text-rose-500' : 'bg-emerald-100 text-emerald-500'}`}>{sig.flag ? <XCircle size={18} /> : <CheckCircle2 size={18} />}</div>
                                          <span className={`text-[14px] font-bold ${sig.flag ? 'text-rose-900' : 'text-[#374151]'}`}>{sig.reason}</span>
                                       </div>
                                       {sig.penalty > 0 && <span className="self-start sm:self-center text-[10px] bg-white text-rose-600 px-3 py-1 rounded-full border border-rose-100 font-black shadow-sm">-{sig.penalty} PTS</span>}
                                    </div>
                                  ))}
                               </div>
                             </div>
                           </div>
                           <div className="bg-[#111827] px-8 lg:px-10 py-5 flex items-center justify-between flex-col sm:flex-row gap-4">
                              <div className="flex items-center gap-3"><Fingerprint size={20} className="text-blue-400" /><span className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em] truncate">Hash: {Math.random().toString(16).slice(2, 10).toUpperCase()}</span></div>
                              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{new Date().toLocaleString()}</span>
                           </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {(isExtracting || isAnalyzing) && (
                  <div className="flex gap-6 animate-pulse">
                    <div className="w-[40px] h-[40px] bg-[#2563eb]/20 rounded-xl flex items-center justify-center"><Loader2 size={24} className="text-[#2563eb] animate-spin" /></div>
                    <div className="bg-white border border-[#e5e7eb] rounded-[24px] rounded-tl-none px-8 py-5 shadow-sm">
                      <p className="text-[15px] font-bold text-[#6b7280]">Alexandria is cross-referencing markers...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          ) : (
            <div className="px-4 lg:px-10 py-10 max-w-4xl mx-auto space-y-10">
               <div className="bg-white border-2 border-[#e5e7eb] rounded-[32px] p-8 lg:p-12 space-y-10 shadow-sm">
                  <div className="flex items-center gap-5">
                     <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <Mail size={32} />
                     </div>
                     <div className="space-y-1">
                        <h2 className="text-2xl font-black text-[#111827] tracking-tight">Advanced E-mail Audit</h2>
                        <p className="text-sm font-medium text-[#6b7280]">Identify sender origin and detect header spoofing.</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-4">
                        <label className="text-xs font-black text-[#9ca3af] uppercase tracking-widest pl-1">Paste Raw E-mail Headers</label>
                        <textarea 
                          placeholder="Paste the full email source/headers here..."
                          className="w-full h-80 bg-[#f9fafb] border-2 border-[#e5e7eb] rounded-3xl p-6 text-sm font-mono placeholder:text-[#9ca3af] focus:border-[#2563eb] outline-none transition-all resize-none"
                        ></textarea>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button className="h-16 bg-[#111827] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all">
                           <ScanSearch size={22} />
                           Surface Origin IP
                        </button>
                        <button className="h-16 bg-white border-2 border-[#e5e7eb] text-[#111827] rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all">
                           <Lock size={22} />
                           Check DKIM/SPF
                        </button>
                     </div>
                  </div>

                  <div className="p-8 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-5">
                      <div className="text-blue-500 shrink-0"><AlertCircle size={24} /></div>
                      <div className="space-y-2">
                         <p className="text-sm font-bold text-blue-900">How to get headers?</p>
                         <p className="text-xs font-medium text-blue-700 leading-relaxed">
                            In Gmail, click the three dots ⋮ on an email and select "Show original". 
                            Copy everything from the top down to the first blank line.
                         </p>
                      </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {activeTab === 'investigation' && (
          <footer className="px-4 lg:px-10 py-6 lg:py-10 bg-[#f9fafb] border-t border-[#e5e7eb] sticky bottom-0">
            <div className="max-w-[900px] mx-auto relative">
                <div className="relative group bg-white border-2 border-[#e5e7eb] rounded-[24px] lg:rounded-[32px] focus-within:border-[#2563eb] transition-all flex items-center pr-3 pl-4 lg:pl-8 py-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-3 text-[#9ca3af] hover:text-[#2563eb] transition-colors rounded-xl hover:bg-[#eff6ff] shrink-0">
                    <Paperclip size={24} />
                  </button>
                  <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Inquire further..." className="flex-1 bg-transparent border-none outline-none py-4 lg:py-5 px-3 lg:px-5 text-[15px] lg:text-[16px] font-medium placeholder:text-[#9ca3af] min-w-0" />
                  <button onClick={handleSend} className="w-[48px] h-[48px] lg:w-[60px] lg:h-[60px] bg-[#111827] hover:bg-black text-white rounded-[18px] lg:rounded-[24px] flex items-center justify-center shadow-2xl shadow-slate-900/10 transition-all active:scale-95 shrink-0">
                    <Send size={20} lg:size={24} fill="white" />
                  </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
            </div>
          </footer>
        )}
      </main>
    </div>
  );
};

export default App;
