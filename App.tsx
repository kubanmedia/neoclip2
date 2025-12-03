import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Home, 
  User, 
  PlusCircle, 
  Play, 
  Download, 
  CheckCircle2, 
  Zap,
  CreditCard,
  Smartphone,
  Ratio,
  Loader2,
  Film,
  RefreshCw,
  Share2,
  Copy,
  Check,
  Maximize2,
  Palette,
  Gift,
  UserPlus,
  Youtube,
  Instagram,
  UploadCloud,
  X,
  Edit3,
  Clock,
  Image as ImageIcon,
  Rocket,
  Lock,
  Crown,
  Settings,
  AlertTriangle,
  ArrowLeft,
  Save,
  Link as LinkIcon,
  MessageSquare,
  LogOut,
  Activity,
  Shield,
  FileText
} from 'lucide-react';
import { checkApiKey, promptApiKeySelection, generateVeoVideo, generatePromptIdeas, generateHDVideo, validateApiConnection, ConnectionDiagnostics } from './services/geminiService';
import { Button, InputArea, LoadingOverlay, FunLoadingOverlay, PremiumBadge, LockOverlay, PremiumBadge as WatermarkBadge, Watermark, Toggle, TextInput, Toast, ImageUploader, AdOverlay, LottieAnimation, IdeaOverlay } from './components/UIComponents';
import { UserState, GeneratedVideo, AppView, VideoConfig } from './types';

// Initial State
const DEFAULT_USER: UserState = {
  isPremium: false,
  credits: 5, // Bonus 'Ultra' credits for standard users
  referralCount: 0,
  hasSelectedKey: false,
  watermarkSettings: {
    text: 'NeoClip AI',
    enabled: true
  },
  referralCode: 'NEO-' + Math.floor(1000 + Math.random() * 9000),
  hasSeenOnboarding: false,
  connectedAccounts: {
    youtube: false,
    tiktok: false,
    instagram: false
  }
};

const SAMPLE_PROMPTS = [
  "Cyberpunk street food stall in heavy rain, neon lights reflecting on wet pavement, cinematic lighting, 4k",
  "Cute fluffy robot playing with a butterfly in a sunlit meadow, ghibli style, peaceful atmosphere",
  "Futuristic sports car driving through a tunnel of light, speed lines, high energy"
];

const STYLES = [
  { name: 'Cinematic', prompt: 'cinematic lighting, photorealistic, 4k, movie scene' },
  { name: 'Anime', prompt: 'anime style, studio ghibli, vibrant colors, 2D animation' },
  { name: 'Watercolor', prompt: 'watercolor painting, soft brushstrokes, artistic, dreamy' },
  { name: 'Cyberpunk', prompt: 'cyberpunk, neon lights, futuristic, high contrast' },
  { name: 'Vintage', prompt: 'vintage 1950s film, grain, black and white, classic' },
  { name: 'Claymation', prompt: 'claymation, stop motion, plasticine texture, cute' },
];

const GENERATION_STEPS = [
  'Initializing NeoClip Agent...',
  'Analyzing prompt vectors...',
  'Synthesizing motion...',
  'Applying style filters...',
  'Finalizing viral output...'
];

const REFERRAL_TARGET = 3;

const App = () => {
  // Persistence Initialization
  const [user, setUser] = useState<UserState>(() => {
    try {
      const saved = localStorage.getItem('neoclip_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const [videos, setVideos] = useState<GeneratedVideo[]>(() => {
    try {
      const saved = localStorage.getItem('neoclip_videos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [view, setView] = useState<AppView>(AppView.HOME);
  
  // Initialize Create Form from Draft or Defaults (Lazy Loaded)
  const [prompt, setPrompt] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem('neoclip_draft') || '{}'); return d.prompt || ''; } catch { return ''; }
  });
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>(() => {
    try { const d = JSON.parse(localStorage.getItem('neoclip_draft') || '{}'); return d.aspectRatio || '9:16'; } catch { return '9:16'; }
  });
  const [selectedStyle, setSelectedStyle] = useState<string | null>(() => {
    try { const d = JSON.parse(localStorage.getItem('neoclip_draft') || '{}'); return d.selectedStyle || null; } catch { return null; }
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(() => {
    try { const d = JSON.parse(localStorage.getItem('neoclip_draft') || '{}'); return d.selectedImage || null; } catch { return null; }
  });
  const [duration, setDuration] = useState<number>(() => {
    try { const d = JSON.parse(localStorage.getItem('neoclip_draft') || '{}'); return d.duration || 15; } catch { return 15; }
  });
  const [modelMode, setModelMode] = useState<'standard' | 'pro'>(() => {
    try { const d = JSON.parse(localStorage.getItem('neoclip_draft') || '{}'); return d.modelMode || 'standard'; } catch { return 'standard'; }
  });
  
  // Suggested Prompts State
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(SAMPLE_PROMPTS);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  // Generation States
  const [isGenerating, setIsGenerating] = useState(false); // For blocking overlay
  const [isVideoProcessing, setIsVideoProcessing] = useState(false); // For inline processing
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState('');
  const [genProgress, setGenProgress] = useState(0);
  const [showAd, setShowAd] = useState(false);
  
  const [showPaywall, setShowPaywall] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Download/Share/Upload States
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);
  const [shareVideo, setShareVideo] = useState<GeneratedVideo | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [uploadVideo, setUploadVideo] = useState<GeneratedVideo | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [styleVideo, setStyleVideo] = useState<GeneratedVideo | null>(null);

  // Invite Friend State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [acceptedInviteCode, setAcceptedInviteCode] = useState<string | null>(null);
  
  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Connection State
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionDiagnostics | null>(null);
  const [lastConnectionCheck, setLastConnectionCheck] = useState<number | null>(null);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('neoclip_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('neoclip_videos', JSON.stringify(videos));
  }, [videos]);

  // Auto-Save Draft Effect
  useEffect(() => {
    setAutoSaveStatus('saving');
    const timer = setTimeout(() => {
      const draftData = {
        prompt,
        aspectRatio,
        selectedStyle,
        selectedImage,
        duration,
        modelMode
      };
      
      try {
        localStorage.setItem('neoclip_draft', JSON.stringify(draftData));
        setAutoSaveStatus('saved');
      } catch (e) {
        console.warn("Draft auto-save failed (likely quota exceeded):", e);
        if (selectedImage) {
           try {
             const { selectedImage: _, ...rest } = draftData;
             localStorage.setItem('neoclip_draft', JSON.stringify(rest));
             setAutoSaveStatus('saved');
           } catch (e2) {
             setAutoSaveStatus('error');
           }
        } else {
           setAutoSaveStatus('error');
        }
      }
    }, 1000); 

    return () => clearTimeout(timer);
  }, [prompt, aspectRatio, selectedStyle, selectedImage, duration, modelMode]);

  // Check Onboarding, Referral Code, and API Key on load
  useEffect(() => {
    const initApp = async () => {
      const params = new URLSearchParams(window.location.search);
      const joinCode = params.get('join');
      
      if (joinCode) {
        if (joinCode !== user.referralCode) {
           setAcceptedInviteCode(joinCode);
        }
        window.history.replaceState({}, '', window.location.pathname);
      }

      if (!user.hasSeenOnboarding) {
        setShowOnboarding(true);
      }
      
      const isKeySelected = await checkApiKey();
      if (isKeySelected && !user.hasSelectedKey) {
        setUser(prev => ({ ...prev, hasSelectedKey: true }));
      }
    };
    initApp();
  }, []);

  // Helpers
  const captureVideoFrame = async (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = "anonymous";
      video.src = videoUrl;
      video.muted = true;
      video.play().catch(() => {});
      video.onloadeddata = () => { video.currentTime = 0.1; };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl.split(',')[1]);
        } else reject(new Error("Canvas context failed"));
        video.remove();
      };
      video.onerror = reject;
    });
  };

  const handleConnectKey = async () => {
    try {
      await promptApiKeySelection();
      setUser(prev => ({ ...prev, hasSelectedKey: true }));
      setToastMessage("Project Selected. Testing Connection...");
      setToastType('success');
      handleTestConnection();
    } catch (e) {
      console.error("Key selection failed", e);
      setToastMessage("Failed to select API Key");
      setToastType('error');
    }
  };
  
  const handleResetConnection = () => {
    setUser(prev => ({ ...prev, hasSelectedKey: false, isPremium: false }));
    setConnectionStatus(null);
    setToastMessage("Connection Reset");
    setToastType('success');
  };

  const handleTestConnection = async () => {
    setIsCheckingConnection(true);
    setConnectionStatus(null);
    try {
      const result = await validateApiConnection();
      setLastConnectionCheck(Date.now());
      setConnectionStatus(result);
      
      if (result.status === 'active') {
        setToastMessage(result.label);
        setToastType('success');
      } else {
        setToastMessage(result.label);
        setToastType('error');
      }
    } catch (e) {
      setToastMessage("Unknown validation error.");
      setToastType('error');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleCompleteOnboarding = () => {
    setUser(prev => ({ ...prev, hasSeenOnboarding: true }));
    setShowOnboarding(false);
  };

  const handleGenerateIdeas = async () => {
    setIsSuggesting(true);
    try {
      const ideas = await generatePromptIdeas(prompt);
      if (ideas.length > 0) setSuggestedPrompts(ideas);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerate = async () => {
    if (modelMode === 'pro' && !user.hasSelectedKey) { handleConnectKey(); return; }
    if (!prompt.trim() && !selectedImage) return;

    if (!user.isPremium && duration > 30) {
      setShowPaywall(true);
      return;
    }

    if (modelMode === 'pro' && !user.isPremium && user.credits <= 0) {
      setShowPaywall(true);
      return;
    }

    setIsVideoProcessing(true);
    setPreviewUrl(null);
    
    // Start Progress
    let stepIndex = 0;
    setGenStatus(GENERATION_STEPS[0]);
    setGenProgress(10);
    
    let statusInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < GENERATION_STEPS.length) {
         setGenStatus(GENERATION_STEPS[stepIndex]);
         // Calculate progress: 10% -> 90% across steps
         const prog = Math.min(90, Math.round(((stepIndex + 1) / GENERATION_STEPS.length) * 100));
         setGenProgress(prog);
      }
    }, 3000); // Cycle steps every 3 seconds

    try {
      let finalPrompt = prompt;
      if (selectedStyle) {
        const style = STYLES.find(s => s.name === selectedStyle);
        if (style) finalPrompt = `${prompt}, ${style.prompt}`;
      }

      const config: VideoConfig = {
        prompt: finalPrompt,
        aspectRatio,
        image: selectedImage || undefined,
        duration,
        model: modelMode 
      };

      const videoUrl = await generateVeoVideo(config);

      const newVideo: GeneratedVideo = {
        id: Date.now().toString(),
        url: videoUrl,
        prompt: finalPrompt || "Image Animation",
        aspectRatio: aspectRatio,
        timestamp: Date.now(),
        quality: modelMode === 'pro' ? 'HD' : 'SD',
        duration,
        model: modelMode
      };

      setVideos(prev => [newVideo, ...prev]);
      setPreviewUrl(videoUrl);
      setGenProgress(100); // Complete

      if (!user.isPremium) {
        setShowAd(true); 
      } else {
        if (modelMode === 'pro') {
           setUser(prev => ({ ...prev, credits: Math.max(0, prev.credits - 1) }));
        }
      }
      setToastMessage("Generation Successful!");
      setToastType('success');

    } catch (error: any) {
      console.error("Generation error:", error);
      const displayMsg = error.message;

      // ACTIONABLE ERROR HANDLING
      
      // 1. Pro Mode Issues -> Downgrade or Connect
      if (modelMode === 'pro' && (displayMsg.includes('Billing') || displayMsg.includes('Permission'))) {
         setTimeout(() => {
            setModelMode('standard');
            setToastMessage("Switched to Free Mode due to account limits.");
         }, 3000);
      }

      // 2. Free Limits -> Upsell
      if (displayMsg.includes('Limit Reached') || displayMsg.includes('Free Limit')) {
         setTimeout(() => {
            setShowPaywall(true);
         }, 2500);
      }
      
      // 3. Safety Block -> Suggest Edit
      if (displayMsg.includes('Safety Block') || displayMsg.includes('NSFW')) {
         // Maybe focus input?
      }

      setToastMessage(displayMsg);
      setToastType('error');
      setGenProgress(0);
      
    } finally {
      clearInterval(statusInterval);
      setIsVideoProcessing(false);
      setGenStatus('');
    }
  };

  const handleAdComplete = () => {
    setShowAd(false);
    setToastMessage("Ad Reward: Video Unlocked!");
    setToastType('success');
  };

  const handleStyleTransfer = async (styleName: string, stylePrompt: string) => {
    if (!styleVideo) return;
    const videoToStyle = styleVideo; 
    setStyleVideo(null);
    setView(AppView.CREATE);
    setPrompt(`${videoToStyle.prompt}, ${styleName} style`);
    setIsVideoProcessing(true);
    setGenStatus("Restyling content...");
    setGenProgress(20);

    try {
      const imageBase64 = await captureVideoFrame(videoToStyle.url);
      setGenProgress(40);
      const config: VideoConfig = {
        prompt: `${videoToStyle.prompt}, ${stylePrompt}`,
        aspectRatio: videoToStyle.aspectRatio,
        image: imageBase64,
        duration: videoToStyle.duration,
        model: 'standard' 
      };

      const videoUrl = await generateVeoVideo(config);
      setVideos(prev => [{
        id: Date.now().toString(),
        url: videoUrl,
        prompt: config.prompt,
        aspectRatio: videoToStyle.aspectRatio,
        timestamp: Date.now(),
        quality: 'SD',
        duration: videoToStyle.duration,
        model: 'standard'
      }, ...prev]);
      
      setPreviewUrl(videoUrl);
      setGenProgress(100);
      setToastMessage("Style applied successfully!");
      setToastType('success');
      if (!user.isPremium) setShowAd(true);

    } catch (error: any) {
      console.error(error);
      setToastMessage(error.message);
      setToastType('error');
      setGenProgress(0);
    } finally {
      setIsVideoProcessing(false);
    }
  };

  const handleUpgrade = () => {
    setIsGenerating(true);
    setGenStatus('Activating NeoClip Pro...');
    setGenProgress(50);
    setTimeout(() => {
      setUser(prev => ({ ...prev, isPremium: true, credits: 100 })); // 100 Pro gens
      setShowPaywall(false);
      setIsGenerating(false);
      setToastMessage("Welcome to NeoClip Pro!");
      setToastType('success');
      setGenProgress(100);
    }, 2000);
  };

  const handleClaimInvite = () => {
     setUser(prev => ({
       ...prev,
       credits: prev.credits + 5
     }));
     setToastMessage("Bonus Credits Added!");
     setToastType('success');
     setAcceptedInviteCode(null);
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) return;
    setTimeout(() => {
      setToastMessage("Feedback received! Thank you.");
      setToastType('success');
      setFeedbackText('');
      setShowFeedbackModal(false);
    }, 500);
  };

  // UI Renderers
  const renderHome = () => (
    <div className="flex flex-col gap-6 pb-24">
      <header className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-mono tracking-tighter">NeoClip</h1>
          <p className="text-[10px] text-slate-400 tracking-widest uppercase">AI Agent</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="p-2" onClick={() => setView(AppView.SETTINGS)}>
            <Settings className="w-5 h-5 text-slate-400" />
          </Button>
          {user.isPremium && <PremiumBadge />}
        </div>
      </header>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60 space-y-6">
          <div className="relative">
             <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 animate-pulse-slow"></div>
             <Rocket className="w-16 h-16 text-cyan-400 animate-float" />
          </div>
          <p className="text-xl font-medium text-white">Start Your Viral Journey</p>
          <p className="text-sm max-w-xs text-slate-400">Generate your first AI Short in seconds. Tap + to begin.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {videos.map(video => (
            <div key={video.id} className="bg-surface rounded-2xl overflow-hidden shadow-2xl border border-slate-800/50 group">
              <div className={`relative bg-black flex items-center justify-center ${video.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                <Watermark 
                  text={user.watermarkSettings.text} 
                  visible={user.watermarkSettings.enabled || !user.isPremium} // Force for free
                />
                
                {/* GRACEFUL FALLBACK: If URL is DataURI (Image), show img. Else show video. */}
                {video.url.startsWith('data:image') ? (
                   <img src={video.url} alt="Generated Content" className="w-full h-full object-cover" />
                ) : (
                   <video src={video.url} controls loop className="w-full h-full object-cover" playsInline />
                )}
                
                {video.model === 'pro' && (
                  <div className="absolute top-4 right-4 bg-purple-500/20 backdrop-blur-md px-2 py-1 rounded-md border border-purple-500/50">
                    <span className="text-[10px] font-bold text-purple-200 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> PRO
                    </span>
                  </div>
                )}
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                   <p className="text-sm text-slate-300 line-clamp-2 italic flex-1 mr-2">"{video.prompt}"</p>
                   <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">{video.duration}s</span>
                </div>
                
                <div className="flex items-center gap-2">
                   <button onClick={() => { setUploadVideo(video); setUploadCaption(`${video.prompt} #NeoClip #AI`); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/30 rounded-xl text-cyan-300 transition-all text-xs font-bold uppercase tracking-wide">
                     <UploadCloud className="w-4 h-4" /> Upload
                   </button>
                   <button onClick={() => setShareVideo(video)} className="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-xl"><Share2 className="w-4 h-4" /></button>
                   <button onClick={() => setStyleVideo(video)} className="p-2 text-slate-400 hover:text-pink-400 bg-slate-800/50 rounded-xl"><Palette className="w-4 h-4" /></button>
                   <button onClick={() => { setPendingDownloadUrl(video.url); setShowDownloadConfirm(true); }} className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-800/50 rounded-xl"><Download className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreate = () => (
    <div className="flex flex-col h-full gap-6 pb-24">
      <header className="px-2 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white font-mono">New Creation</h2>
        <div className="flex items-center gap-1.5 opacity-60">
           {autoSaveStatus === 'saving' && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
           {autoSaveStatus === 'saved' && <Check className="w-3 h-3 text-cyan-500" />}
           {autoSaveStatus === 'error' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
           <span className="text-[10px] text-slate-500 uppercase tracking-wider">
             {autoSaveStatus === 'saving' ? 'Saving...' : autoSaveStatus === 'error' ? 'Storage Full' : 'Draft Saved'}
           </span>
        </div>
      </header>

      <div className="flex-1 space-y-6">
        {/* Model Selector */}
        <div className="bg-surface p-1 rounded-xl flex border border-slate-800">
           <button 
             onClick={() => setModelMode('standard')}
             className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${modelMode === 'standard' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500'}`}
           >
             Standard (Free Hybrid)
           </button>
           <button 
             onClick={() => setModelMode('pro')}
             className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${modelMode === 'pro' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-slate-500'}`}
           >
             <Sparkles className="w-3 h-3" /> NeoClip Pro
           </button>
        </div>

        {/* Input Section - Compact & Inline */}
        <div className={`space-y-4 ${isVideoProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
           <div className="flex flex-col gap-2">
               <div className="flex justify-between items-center">
                   <label className="text-xs font-medium text-slate-400 ml-1 flex items-center gap-2">
                      <Edit3 className="w-3 h-3" /> Video Description
                   </label>
                   
                   {/* Inspiration Button */}
                   <button 
                      onClick={handleGenerateIdeas}
                      disabled={isSuggesting}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/30 px-2 py-1 rounded-full border border-cyan-500/20 transition-all relative z-10"
                    >
                      {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {isSuggesting ? 'Thinking...' : 'Inspire Me'}
                    </button>
                    {isSuggesting && <div className="absolute right-4 top-48 z-20"><IdeaOverlay /></div>}
               </div>

               <div className="flex gap-3">
                   {/* Compact Image Uploader */}
                   <ImageUploader 
                     selectedImage={selectedImage} 
                     onImageSelect={setSelectedImage} 
                     onClear={() => setSelectedImage(null)} 
                     className="w-24 h-auto min-h-[6rem] bg-surface/30 shrink-0 border-dashed"
                   />
                   
                   {/* Text Area */}
                   <textarea
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                     placeholder={selectedImage ? "Describe how to animate this..." : "Describe your viral video idea..."}
                     className="flex-1 h-24 bg-surface/50 border border-slate-700 rounded-2xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none transition-all text-sm"
                   />
               </div>
           </div>
        </div>

        {/* Suggested Chips */}
        {!isVideoProcessing && suggestedPrompts.length > 0 && !selectedImage && (
           <div className="overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex gap-2">
                 {suggestedPrompts.map((p, i) => (
                    <button 
                      key={i} 
                      onClick={() => setPrompt(p)}
                      className="whitespace-nowrap px-3 py-1.5 bg-surface border border-slate-800 rounded-full text-[10px] text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
                    >
                      {p.slice(0, 30)}...
                    </button>
                 ))}
              </div>
           </div>
        )}

        {/* Controls */}
        <div className={`grid grid-cols-2 gap-4 ${isVideoProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
           <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 ml-1">Aspect Ratio</label>
              <div className="flex gap-2">
                 <button onClick={() => setAspectRatio('9:16')} className={`flex-1 p-3 rounded-xl border ${aspectRatio === '9:16' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-slate-700 bg-surface text-slate-500'}`}>
                    <Smartphone className="w-5 h-5 mx-auto" />
                 </button>
                 <button onClick={() => setAspectRatio('16:9')} className={`flex-1 p-3 rounded-xl border ${aspectRatio === '16:9' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-slate-700 bg-surface text-slate-500'}`}>
                    <Ratio className="w-5 h-5 mx-auto" />
                 </button>
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 ml-1">Duration</label>
              <div className="flex gap-2 h-[46px] bg-surface rounded-xl border border-slate-700 p-1">
                 {[15, 30].map(d => (
                   <button 
                     key={d} 
                     onClick={() => setDuration(d)}
                     className={`flex-1 rounded-lg text-xs font-bold transition-all ${duration === d ? 'bg-slate-600 text-white' : 'text-slate-500'}`}
                   >
                     {d}s
                   </button>
                 ))}
                 <button 
                    onClick={() => setDuration(60)}
                    className={`flex-1 rounded-lg text-xs font-bold transition-all relative ${duration === 60 ? 'bg-purple-600 text-white' : 'text-slate-500'}`}
                 >
                    60s
                    {!user.isPremium && <div className="absolute -top-1 -right-1"><Lock className="w-3 h-3 text-amber-400" /></div>}
                 </button>
              </div>
           </div>
        </div>

        {/* Generate Button */}
        <div className="pt-4">
           <Button 
              onClick={handleGenerate} 
              className="w-full" 
              icon={isVideoProcessing ? undefined : Zap}
              disabled={(!prompt.trim() && !selectedImage) || isVideoProcessing}
           >
              {isVideoProcessing ? 'Generating...' : 
                selectedImage ? (modelMode === 'pro' ? 'Animate Photo Pro (1 Credit)' : 'Animate Photo (Free)') :
                (modelMode === 'pro' ? 'Generate Pro (1 Credit)' : 'Generate Free')
              }
           </Button>
           {modelMode === 'standard' && <p className="text-center text-[10px] text-slate-500 mt-2">Free generation includes short ad.</p>}
        </div>

        {/* Preview Area */}
        {(isVideoProcessing || previewUrl) && (
           <div className="rounded-2xl overflow-hidden border border-slate-700 bg-black relative">
              {isVideoProcessing ? (
                 <div className="aspect-[9/16] flex flex-col items-center justify-center p-6 text-center space-y-4 relative overflow-hidden bg-slate-900/50">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-scan h-[200%] -top-full"></div>
                    
                    <div className="relative w-40 h-40">
                       <div className="absolute inset-0 bg-cyan-500/20 blur-3xl animate-pulse-slow"></div>
                       <LottieAnimation src="https://lottie.host/93292416-8360-4929-9b48-356784013401/J0Xy2y2y2y.json" />
                    </div>

                    <div className="relative z-10 space-y-2 max-w-[80%] w-64">
                      <div className="flex justify-between text-xs text-cyan-400 font-mono tracking-wider uppercase">
                         <span className="animate-pulse">{genStatus}</span>
                         <span>{genProgress}%</span>
                      </div>
                      
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                         <div 
                           className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                           style={{ width: `${genProgress}%` }}
                         />
                      </div>
                    </div>
                 </div>
              ) : (
                 <div className="aspect-[9/16] relative group">
                    <Watermark text={user.watermarkSettings.text} visible={user.watermarkSettings.enabled || !user.isPremium} />
                    
                    {/* GRACEFUL FALLBACK RENDERER */}
                    {previewUrl?.startsWith('data:image') ? (
                       <img src={previewUrl} alt="Generated Content" className="w-full h-full object-cover" />
                    ) : (
                       <video src={previewUrl!} controls className="w-full h-full object-contain" />
                    )}
                 </div>
              )}
           </div>
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="flex flex-col gap-6">
      <header className="px-2 flex justify-between items-center">
         <h2 className="text-xl font-bold text-white font-mono">Agent Profile</h2>
         <Button variant="ghost" className="p-2" onClick={() => setView(AppView.SETTINGS)}>
            <Settings className="w-5 h-5 text-slate-400" />
         </Button>
      </header>

      <div className="bg-surface p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xl">
        <div>
           <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Status</p>
           <h3 className="text-xl font-bold text-white flex items-center gap-2">
             {user.isPremium ? 'NeoClip Pro' : 'Free Agent'}
             {user.isPremium && <PremiumBadge />}
           </h3>
           <p className="text-xs text-cyan-400 mt-1">{user.isPremium ? 'Unlimited Access' : 'Ad-Supported'}</p>
        </div>
        <Button onClick={() => setView(AppView.PREMIUM)} variant="primary" className="px-4 py-2 text-xs">
           {user.isPremium ? 'Manage' : 'Go Pro'}
        </Button>
      </div>

      <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10"><Gift className="w-24 h-24 text-white" /></div>
         <h3 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus className="w-5 h-5 text-purple-400" /> Affiliate Program</h3>
         <p className="text-sm text-purple-200 mb-4">Invite 3 friends to unlock 1 Month of Premium + 5 Ultra Credits.</p>
         
         <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
               <div className="h-full bg-purple-500" style={{ width: `${(user.referralCount / REFERRAL_TARGET) * 100}%` }}></div>
            </div>
            <span className="text-xs font-bold text-white">{user.referralCount}/{REFERRAL_TARGET}</span>
         </div>
         
         <Button onClick={() => setShowInviteModal(true)} variant="secondary" className="w-full text-xs">Invite Friends</Button>
      </div>
      
      <div className="flex justify-center">
         <button onClick={() => setShowFeedbackModal(true)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors">
            <MessageSquare className="w-4 h-4" /> Send Feedback
         </button>
      </div>
      
       {/* Footer Links - Profile View */}
       <div className="flex justify-center gap-6 mt-4 text-[10px] text-slate-600 uppercase tracking-widest">
            <button onClick={() => setView(AppView.TERMS)} className="hover:text-slate-400 transition-colors">Terms</button>
            <button onClick={() => setView(AppView.PRIVACY)} className="hover:text-slate-400 transition-colors">Privacy</button>
       </div>
    </div>
  );

  const renderTerms = () => (
    <div className="flex flex-col gap-6 pb-24">
      <header className="px-2 flex items-center gap-3">
         <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => setView(AppView.SETTINGS)}>
            <ArrowLeft className="w-6 h-6 text-slate-400" />
         </Button>
         <h2 className="text-xl font-bold text-white font-mono">Terms of Use</h2>
      </header>

      <div className="bg-surface rounded-2xl p-6 border border-slate-800 space-y-6 text-slate-300 text-sm leading-relaxed overflow-y-auto h-[70vh]">
        <section>
          <h3 className="text-white font-bold text-lg mb-2">1. Agreement to Terms</h3>
          <p>By accessing or using NeoClip AI ("the App"), a premier <strong>AI Video Generator</strong> and <strong>Text to Video</strong> creation tool, you agree to be bound by these Terms of Use. If you do not agree, please do not use our services.</p>
        </section>

        <section>
          <h3 className="text-white font-bold text-lg mb-2">2. Description of Service</h3>
          <p>NeoClip AI provides advanced <strong>AI content creation</strong> tools, allowing users to generate short-form videos from text prompts ("Generations") for platforms like YouTube Shorts, TikTok, and Instagram Reels.</p>
        </section>

        <section>
          <h3 className="text-white font-bold text-lg mb-2">3. User Rights & Content Ownership</h3>
          <p>You retain ownership of the text prompts you input. Regarding the AI-generated video assets:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
             <li><strong>Free Tier:</strong> Usage is subject to the Creative Commons (CC-BY) license of the underlying models (e.g., Stable Video Diffusion), usually requiring attribution.</li>
             <li><strong>Pro Tier:</strong> You receive a commercial license to use the generated <strong>viral shorts</strong> for your business or personal brand, subject to Google Veo's specific terms.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-white font-bold text-lg mb-2">4. User Conduct</h3>
          <p>You strictly agree NOT to use this <strong>AI Video Maker</strong> to generate:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>NSFW, pornographic, or sexually explicit content.</li>
            <li>Hate speech, harassment, or content promoting violence.</li>
            <li>Deepfakes intended to defame or deceive.</li>
            <li>Content infringing on third-party copyrights.</li>
          </ul>
          <p className="mt-2 text-red-400">Violation results in immediate ban without refund.</p>
        </section>

        <section>
          <h3 className="text-white font-bold text-lg mb-2">5. Subscriptions & Billing</h3>
          <p><strong>NeoClip Pro</strong> subscriptions unlock high-quality <strong>HD video export</strong> and remove watermarks.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
             <li>Payment is charged at confirmation of purchase.</li>
             <li>Subscription auto-renews unless turned off 24-hours before end of period.</li>
             <li>Unused "Ultra Credits" do not rollover to the next month.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-white font-bold text-lg mb-2">6. Disclaimers</h3>
          <p>The App uses experimental <strong>Generative AI</strong> technology. We do not guarantee that results will be error-free or fully accurate. The service is provided "AS IS".</p>
        </section>
        
        <p className="text-xs text-slate-500 mt-8">Contact: legal@neoclip.ai | Last Updated: November 2025</p>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="flex flex-col gap-6 pb-24">
      <header className="px-2 flex items-center gap-3">
         <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => setView(AppView.SETTINGS)}>
            <ArrowLeft className="w-6 h-6 text-slate-400" />
         </Button>
         <h2 className="text-xl font-bold text-white font-mono">Privacy Policy</h2>
      </header>

      <div className="bg-surface rounded-2xl p-6 border border-slate-800 space-y-6 text-slate-300 text-sm leading-relaxed overflow-y-auto h-[70vh]">
        <section>
          <h3 className="text-white font-bold text-lg mb-2">1. Data Collection Overview</h3>
          <p>As a powerful <strong>AI Video Generator</strong>, NeoClip AI collects minimal data to function:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Input Data:</strong> Text prompts ("Video Descriptions") and uploaded reference images.</li>
            <li><strong>Generated Content:</strong> The videos created by the AI models.</li>
            <li><strong>Device Info:</strong> IDFA/IDFV for subscription management and app optimization.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-white font-bold text-lg mb-2">2. Use of Data</h3>
          <p>We use your data to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Provide the <strong>Text to Video</strong> generation service.</li>
            <li>Manage your "NeoClip Pro" subscription.</li>
            <li>Improve our AI models (anonymized data only).</li>
          </ul>
        </section>

        <section>
          <h3 className="text-white font-bold text-lg mb-2">3. Third-Party AI Processors</h3>
          <p>To generate high-quality <strong>viral content</strong>, we transmit prompts to trusted partners:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Google Cloud (Vertex AI / Gemini):</strong> For Pro tier video synthesis.</li>
            <li><strong>Segmind & Pollinations.ai:</strong> For standard tier <strong>AI art</strong> and video generation.</li>
          </ul>
          <p className="mt-2">Data sent to these providers is transient and processed under strict enterprise privacy agreements.</p>
        </section>

        <section>
          <h3 className="text-white font-bold text-lg mb-2">4. Data Retention & Deletion</h3>
          <p>Generated videos are stored locally on your device. We do not store your generations on our servers permanently. You can clear your app data at any time via Settings > Reset.</p>
          <p>To request full account deletion, email privacy@neoclip.ai.</p>
        </section>

        <section>
          <h3 className="text-white font-bold text-lg mb-2">5. Children's Privacy</h3>
          <p>This <strong>Video Editor</strong> app is not directed at children under 13. We do not knowingly collect personal data from minors.</p>
        </section>

        <p className="text-xs text-slate-500 mt-8">Questions? Contact privacy@neoclip.ai | Last Updated: November 2025</p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col gap-6">
      <header className="px-2 flex items-center gap-3">
         <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => setView(AppView.PROFILE)}>
            <ArrowLeft className="w-6 h-6 text-slate-400" />
         </Button>
         <h2 className="text-xl font-bold text-white font-mono">Settings</h2>
      </header>

      {/* Watermark Section - Locked for Free */}
      <div className="bg-surface rounded-xl p-5 border border-slate-800 relative overflow-hidden space-y-4">
         {!user.isPremium && <LockOverlay onUnlock={() => setView(AppView.PREMIUM)} />}
         <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-white">Custom Watermark</span>
            <Toggle checked={user.watermarkSettings.enabled} onToggle={() => setUser(p => ({ ...p, watermarkSettings: { ...p.watermarkSettings, enabled: !p.watermarkSettings.enabled }}))} />
         </div>
         <TextInput value={user.watermarkSettings.text} onChange={(e) => setUser(p => ({ ...p, watermarkSettings: { ...p.watermarkSettings, text: e.target.value }}))} />
      </div>

      {/* System Status Dashboard */}
      <div className="bg-surface rounded-xl border border-slate-800 overflow-hidden">
         <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h3 className="text-md font-bold text-white flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-400" /> System Status</h3>
         </div>
         
         <div className="p-4 space-y-4">
            {/* Free Tier Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-slate-800">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <div>
                     <p className="text-sm font-bold text-white">Free Agent (Standard)</p>
                     <p className="text-[10px] text-slate-500">Hybrid Model Chain (Segmind)</p>
                  </div>
               </div>
               <span className="text-xs text-green-400 font-medium">Operational</span>
            </div>

            {/* Pro Tier Status */}
            <div className={`flex flex-col gap-3 p-3 rounded-lg border ${!user.hasSelectedKey ? 'bg-slate-800/30 border-slate-700 border-dashed' : connectionStatus?.status === 'issue' ? 'bg-red-500/10 border-red-500/30' : 'bg-cyan-500/10 border-cyan-500/30'}`}>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className={`w-2 h-2 rounded-full ${!user.hasSelectedKey ? 'bg-slate-500' : connectionStatus?.status === 'active' ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`}></div>
                     <div>
                        <p className="text-sm font-bold text-white">NeoClip Pro (Veo 3)</p>
                        <p className="text-[10px] text-slate-500">Google Cloud Vertex AI</p>
                     </div>
                  </div>
                  {!user.hasSelectedKey ? (
                     <Button variant="outline" className="text-[10px] px-2 py-1 h-auto" onClick={handleConnectKey}>Connect</Button>
                  ) : (
                     <span className={`text-xs font-medium ${connectionStatus?.status === 'active' ? 'text-cyan-400' : 'text-red-400'}`}>
                        {connectionStatus?.status === 'active' ? 'Connected' : 'Attention Needed'}
                     </span>
                  )}
               </div>
               
               {user.hasSelectedKey && (
                 <div className="mt-1 pl-5 border-l-2 border-slate-700/50 ml-1">
                   {connectionStatus ? (
                      <div className="space-y-1">
                        <p className="text-xs text-white">{connectionStatus.details}</p>
                        {connectionStatus.action && <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">{connectionStatus.action}</p>}
                      </div>
                   ) : (
                      <p className="text-xs text-slate-500 italic">Diagnostics pending...</p>
                   )}
                   <div className="flex gap-2 mt-3">
                     <Button 
                       variant="secondary" 
                       className="text-[10px] py-1.5 h-auto flex-1" 
                       onClick={handleTestConnection}
                       disabled={isCheckingConnection}
                     >
                       {isCheckingConnection ? 'Checking...' : 'Run Diagnostics'}
                     </Button>
                     <Button 
                       variant="ghost" 
                       className="text-[10px] py-1.5 h-auto text-red-400 hover:text-red-300 hover:bg-red-950/30" 
                       onClick={handleResetConnection}
                       icon={LogOut}
                     >
                       Disconnect
                     </Button>
                   </div>
                 </div>
               )}
            </div>
         </div>
       </div>
      
      {/* Footer Links - Settings View */}
      <div className="flex flex-col items-center gap-2 mt-auto">
         <button onClick={() => setShowFeedbackModal(true)} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Report Bug / Suggest Feature
         </button>
         <div className="flex gap-6 text-[10px] text-slate-600 uppercase tracking-widest mt-2">
            <button onClick={() => setView(AppView.TERMS)} className="hover:text-slate-400 transition-colors">Terms</button>
            <button onClick={() => setView(AppView.PRIVACY)} className="hover:text-slate-400 transition-colors">Privacy</button>
         </div>
      </div>
    </div>
  );

  const renderPremium = () => (
    <div className="flex flex-col gap-6 pb-24">
      <header className="px-2">
         <h2 className="text-xl font-bold text-white font-mono">Subscription Plans</h2>
      </header>

      {/* Plans Container */}
      <div className="space-y-4">
        
        {/* Free Plan */}
        <div className={`p-6 rounded-2xl border transition-all ${!user.isPremium ? 'bg-surface border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'bg-surface/50 border-slate-800 opacity-60'}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Free Agent</h3>
              <p className="text-sm text-slate-400">Essential Tools</p>
            </div>
            <div className="text-right">
               <span className="text-xl font-bold text-white">$0</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
             <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-cyan-500" /> Unlimited Standard Gens</li>
             <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-cyan-500" /> 30s Video Limit</li>
             <li className="flex items-center gap-3 text-sm text-slate-500"><Zap className="w-4 h-4 text-yellow-500" /> Ad-Supported</li>
             <li className="flex items-center gap-3 text-sm text-slate-500"><Lock className="w-4 h-4" /> Watermark Locked</li>
          </ul>
          {!user.isPremium && (
             <div className="w-full py-2 text-center text-sm font-bold text-cyan-500 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
               Current Plan
             </div>
          )}
        </div>

        {/* Premium Plan */}
        <div className={`p-6 rounded-2xl border relative overflow-hidden transition-all ${user.isPremium ? 'bg-gradient-to-br from-purple-900/40 to-slate-900 border-purple-500 shadow-xl shadow-purple-500/20' : 'bg-surface border-slate-700 hover:border-purple-500/50'}`}>
          {user.isPremium && (
             <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">ACTIVE</div>
          )}
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">NeoClip Pro <Sparkles className="w-4 h-4 text-purple-400" /></h3>
              <p className="text-sm text-purple-300">Viral Powerhouse</p>
            </div>
            <div className="text-right">
               <span className="text-2xl font-bold text-white">$2.99</span>
               <span className="text-xs text-slate-500 block">/month</span>
            </div>
          </div>
          
          <div className="h-px bg-slate-700/50 mb-4" />

          <ul className="space-y-3 mb-8 relative z-10">
             <li className="flex items-center gap-3 text-sm text-white"><CheckCircle2 className="w-4 h-4 text-purple-400" /> <span className="font-bold">Ad-Free</span> Experience</li>
             <li className="flex items-center gap-3 text-sm text-white"><CheckCircle2 className="w-4 h-4 text-purple-400" /> <span className="font-bold">Priority Queue</span> (Fastest)</li>
             <li className="flex items-center gap-3 text-sm text-white"><CheckCircle2 className="w-4 h-4 text-purple-400" /> <span className="font-bold">60s</span> Max Duration</li>
             <li className="flex items-center gap-3 text-sm text-white"><CheckCircle2 className="w-4 h-4 text-purple-400" /> <span className="font-bold">Remove/Edit Watermark</span></li>
             <li className="flex items-center gap-3 text-sm text-white"><CheckCircle2 className="w-4 h-4 text-purple-400" /> 100 Veo 3 Credits / mo</li>
          </ul>

          {!user.isPremium ? (
            <Button onClick={handleUpgrade} className="w-full relative overflow-hidden group" icon={CreditCard}>
               <span className="relative z-10">Upgrade to Pro</span>
               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </Button>
          ) : (
            <div className="w-full py-2 text-center text-sm font-bold text-purple-400 bg-purple-500/10 rounded-xl border border-purple-500/20">
               Next billing: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}
            </div>
          )}
        </div>

      </div>

      {/* Footer Actions */}
      <div className="flex flex-col gap-4 items-center mt-auto">
         <Button 
           variant="ghost" 
           onClick={() => {
             setToastMessage("Purchases Restored");
             setToastType('success');
             if (!user.isPremium) handleUpgrade(); // Simulating restore for demo
           }}
           className="text-xs text-slate-400 hover:text-white"
         >
           Restore Purchases
         </Button>
         
         <div className="flex gap-6 text-[10px] text-slate-600 uppercase tracking-widest">
            <button onClick={() => setView(AppView.TERMS)} className="hover:text-slate-400 transition-colors">Terms</button>
            <button onClick={() => setView(AppView.PRIVACY)} className="hover:text-slate-400 transition-colors">Privacy</button>
         </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-darker text-white font-sans selection:bg-cyan-500/30">
       <main className="max-w-md mx-auto min-h-screen bg-dark shadow-2xl relative flex flex-col">
          <div className="flex-1 p-6 overflow-y-auto">
             {view === AppView.HOME && renderHome()}
             {view === AppView.CREATE && renderCreate()}
             {view === AppView.PROFILE && renderProfile()}
             {view === AppView.PREMIUM && renderPremium()}
             {view === AppView.SETTINGS && renderSettings()}
             {view === AppView.TERMS && renderTerms()}
             {view === AppView.PRIVACY && renderPrivacy()}
          </div>

          <div className="sticky bottom-0 bg-dark/90 backdrop-blur-lg border-t border-slate-800 p-4 flex justify-between items-center z-40 px-8 pb-8 pb-safe">
             <button onClick={() => setView(AppView.HOME)} className={`flex flex-col items-center gap-1 ${view === AppView.HOME ? 'text-cyan-400' : 'text-slate-500'}`}>
                <Home className="w-6 h-6" /> <span className="text-[10px]">Feed</span>
             </button>
             <button onClick={() => setView(AppView.CREATE)} className="relative -top-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 animate-pulse-slow">
                   <PlusCircle className="w-8 h-8 text-white" />
                </div>
             </button>
             <button onClick={() => setView(AppView.PROFILE)} className={`flex flex-col items-center gap-1 ${view === AppView.PROFILE || view === AppView.SETTINGS || view === AppView.PREMIUM || view === AppView.TERMS || view === AppView.PRIVACY ? 'text-cyan-400' : 'text-slate-500'}`}>
                <User className="w-6 h-6" /> <span className="text-[10px]">Agent</span>
             </button>
          </div>
       </main>

       {/* Onboarding Modal */}
       {showOnboarding && (
         <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="relative mb-8 w-64 h-64 mx-auto animate-float overflow-hidden rounded-2xl ring-1 ring-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.1)] bg-slate-900">
               {/* Grid Background */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
               
               <LottieAnimation src="https://lottie.host/4b85e050-a9d7-4001-923f-4223136209cf/c2c2c2c2c2.json" />
               
               {/* Glow */}
               <div className="absolute inset-0 bg-cyan-500/10 blur-2xl opacity-50 animate-pulse z-0"></div>
               
               {/* Enhanced Scan Effect */}
               <div className="absolute inset-0 w-full h-[50%] bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent animate-scan pointer-events-none z-10"></div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 font-mono">NeoClip AI</h1>
            <p className="text-xl text-cyan-400 mb-6">The AI Co-Pilot for Creators</p>
            <p className="text-slate-400 text-sm mb-12 max-w-xs mx-auto leading-relaxed">
               Prompt to Post in 60 Seconds. Generate viral shorts, edit, and upload for free.
            </p>
            <Button onClick={handleCompleteOnboarding} className="w-full max-w-xs py-4 text-lg">
               Start Creating Magic
            </Button>
         </div>
       )}

       {showAd && <AdOverlay onComplete={handleAdComplete} />}
       {isGenerating && (
          modelMode === 'standard' ? 
          <FunLoadingOverlay status={genStatus} progress={genProgress} /> :
          <LoadingOverlay status={genStatus} progress={genProgress} />
       )}
       {toastMessage && <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />}
       {showPaywall && (
         <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-surface w-full max-w-sm rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-6 slide-in-from-bottom-10">
              <div className="text-center">
                 <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                    <Sparkles className="w-8 h-8 text-white" />
                 </div>
                 <h3 className="text-2xl font-bold text-white">NeoClip Pro</h3>
                 <p className="text-slate-400 text-sm mt-2">Unlock the full power of Veo 3</p>
              </div>
              <div className="space-y-3">
                 <div className="flex gap-3 items-center text-sm p-3 bg-white/5 rounded-xl"><CheckCircle2 className="w-5 h-5 text-green-400" /> Ad-Free Experience</div>
                 <div className="flex gap-3 items-center text-sm p-3 bg-white/5 rounded-xl"><Clock className="w-5 h-5 text-purple-400" /> 60s Video Duration</div>
                 <div className="flex gap-3 items-center text-sm p-3 bg-white/5 rounded-xl"><Edit3 className="w-5 h-5 text-cyan-400" /> Remove/Edit Watermark</div>
              </div>
              <Button onClick={() => {
                 setShowPaywall(false);
                 setView(AppView.PREMIUM);
              }} className="w-full" icon={CreditCard}>View Plans</Button>
           </div>
         </div>
       )}
       {showDownloadConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-xs rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
             <div className="text-center space-y-2">
               <h3 className="text-lg font-bold text-white">Save Video</h3>
               <p className="text-slate-400 text-sm">Download for personal use?</p>
             </div>
             <div className="flex gap-3 pt-2">
               <Button onClick={() => setShowDownloadConfirm(false)} variant="secondary" className="flex-1 py-2 text-xs">Cancel</Button>
               <Button onClick={() => {
                 if (pendingDownloadUrl) {
                    const a = document.createElement('a'); a.href = pendingDownloadUrl; a.download = `neoclip-${Date.now()}.mp4`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                 }
                 setShowDownloadConfirm(false);
               }} variant="primary" className="flex-1 py-2 text-xs">Save</Button>
             </div>
          </div>
        </div>
      )}
       
       {/* Setup Modal */}
       {!user.hasSelectedKey && !showOnboarding && !user.isPremium && view !== AppView.CREATE && view !== AppView.PREMIUM && view !== AppView.SETTINGS && view !== AppView.TERMS && view !== AppView.PRIVACY && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-darker p-6">
           <div className="max-w-xs w-full text-center space-y-8">
             <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600 font-mono">NeoClip AI</h1>
             <div className="p-6 bg-surface rounded-2xl border border-slate-800">
               <p className="text-sm text-slate-300 mb-6">Connect your Cloud Agent to begin.</p>
               <Button onClick={handleConnectKey} className="w-full">Connect API</Button>
               <button onClick={() => setView(AppView.CREATE)} className="mt-4 text-xs text-slate-500 underline">Try Free Mode</button>
             </div>
           </div>
         </div>
       )}
       {/* Invite Modal */}
       {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="text-lg font-bold text-white">Invite & Earn</h3>
               <button onClick={() => setShowInviteModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             <p className="text-slate-400 text-sm">Share your link. Get Premium + 5 Ultra Credits for every 3 friends.</p>
             
             <div className="bg-black/40 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <code className="text-cyan-400 text-sm font-mono truncate mr-2">{`${window.location.origin}?join=${user.referralCode}`}</code>
                <button onClick={() => {
                   navigator.clipboard.writeText(`${window.location.origin}?join=${user.referralCode}`);
                   setCopiedReferral(true);
                   setTimeout(() => setCopiedReferral(false), 2000);
                }} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors shrink-0">
                   {copiedReferral ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
                </button>
             </div>
             
             <Button onClick={() => {
               if (navigator.share) {
                 navigator.share({
                   title: 'Join NeoClip AI',
                   text: 'Create viral shorts with AI in seconds! Join me on NeoClip.',
                   url: `${window.location.origin}?join=${user.referralCode}`
                 });
               }
             }} className="w-full" icon={Share2}>Share Link</Button>
          </div>
        </div>
       )}
       
       {/* Feedback Modal */}
       {showFeedbackModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-surface w-full max-w-sm rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-cyan-400" /> Feedback
                 </h3>
                 <button onClick={() => setShowFeedbackModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <p className="text-slate-400 text-sm">Found a bug or have a suggestion? Let us know!</p>
              
              <InputArea 
                 label="Message"
                 placeholder="Describe the issue or idea..."
                 value={feedbackText}
                 onChange={(e) => setFeedbackText(e.target.value)}
              />
              
              <Button onClick={handleFeedbackSubmit} disabled={!feedbackText.trim()} className="w-full">
                 Submit Report
              </Button>
           </div>
         </div>
       )}

       {/* Invite Acceptance Modal */}
       {acceptedInviteCode && (
         <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-surface border border-cyan-500/50 p-8 rounded-3xl max-w-sm text-center shadow-2xl shadow-cyan-500/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-purple-500"></div>
                <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                    <Gift className="w-8 h-8 text-cyan-400 animate-bounce" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Invitation Accepted!</h2>
                <p className="text-slate-400 text-sm mb-6">
                    You've joined the NeoClip network using code <span className="text-cyan-400 font-mono font-bold">{acceptedInviteCode}</span>.
                </p>
                <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 mb-6">
                    <p className="text-xs text-purple-300 font-bold uppercase tracking-wider mb-1">Bonus Unlocked</p>
                    <p className="text-white font-bold text-lg">+5 Ultra Credits</p>
                </div>
                <Button onClick={handleClaimInvite} className="w-full">
                    Claim & Start Creating
                </Button>
            </div>
         </div>
       )}

       {/* Social Upload Modal */}
       {uploadVideo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface w-full max-w-sm rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4 slide-in-from-bottom-10">
             <div className="flex justify-between items-center">
               <h3 className="text-lg font-bold text-white flex items-center gap-2"><UploadCloud className="w-5 h-5 text-cyan-400" /> Upload Studio</h3>
               <button onClick={() => setUploadVideo(null)}><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             
             <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
               
               {/* PREVIEW HANDLER for Upload Studio */}
               {uploadVideo.url.startsWith('data:image') ? (
                  <img src={uploadVideo.url} className="w-full h-full object-cover" />
               ) : (
                  <video src={uploadVideo.url} className="w-full h-full object-cover" />
               )}

             </div>
             
             <div className="space-y-2">
               <label className="text-xs text-slate-400 font-medium">Caption & Hashtags</label>
               <textarea 
                 value={uploadCaption} 
                 onChange={(e) => setUploadCaption(e.target.value)}
                 className="w-full h-24 bg-black/40 border border-slate-800 rounded-xl p-3 text-sm text-white resize-none focus:border-cyan-500 focus:outline-none"
               />
             </div>
             
             <div className="grid grid-cols-3 gap-2 pt-2">
               <button onClick={() => {
                  setToastMessage("Preparing YouTube Upload...");
                  setToastType('success');
                  navigator.clipboard.writeText(uploadCaption);
                  setTimeout(() => {
                    const a = document.createElement('a'); a.href = uploadVideo.url; a.download = 'neoclip-short.mp4'; a.click();
                    window.open('https://studio.youtube.com/', '_blank');
                  }, 1500);
               }} className="flex flex-col items-center gap-1 p-3 bg-[#FF0000]/10 border border-[#FF0000]/30 rounded-xl hover:bg-[#FF0000]/20 transition-colors">
                  <Youtube className="w-5 h-5 text-[#FF0000]" />
                  <span className="text-[10px] text-white font-medium">Shorts</span>
               </button>
               
               <button onClick={() => {
                  setToastMessage("Preparing TikTok Upload...");
                  setToastType('success');
                  navigator.clipboard.writeText(uploadCaption);
                  setTimeout(() => {
                    const a = document.createElement('a'); a.href = uploadVideo.url; a.download = 'neoclip-short.mp4'; a.click();
                    window.open('https://www.tiktok.com/upload', '_blank');
                  }, 1500);
               }} className="flex flex-col items-center gap-1 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
                  <span className="w-5 h-5 font-bold text-white flex items-center justify-center">dT</span>
                  <span className="text-[10px] text-white font-medium">TikTok</span>
               </button>
               
               <button onClick={() => {
                  setToastMessage("Opening Instagram...");
                  setToastType('success');
                  navigator.clipboard.writeText(uploadCaption);
                  setTimeout(() => {
                    const a = document.createElement('a'); a.href = uploadVideo.url; a.download = 'neoclip-reel.mp4'; a.click();
                    window.open('https://www.instagram.com/', '_blank');
                  }, 1500);
               }} className="flex flex-col items-center gap-1 p-3 bg-gradient-to-tr from-yellow-500/10 via-red-500/10 to-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-white/5 transition-colors">
                  <Instagram className="w-5 h-5 text-pink-500" />
                  <span className="text-[10px] text-white font-medium">Reels</span>
               </button>
             </div>
          </div>
        </div>
       )}

       {/* Share Modal */}
       {shareVideo && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-surface w-full max-w-sm rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Share Video</h3>
                <button onClick={() => setShareVideo(null)}><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             
             <div className="flex items-center gap-2 p-3 bg-black/40 rounded-xl border border-slate-800">
               <code className="text-cyan-400 text-xs truncate flex-1">{`${window.location.origin}?v=${shareVideo.id}`}</code>
               <button onClick={() => {
                 setCopiedLink(true);
                 setTimeout(() => setCopiedLink(false), 2000);
               }} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600">
                 {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
               </button>
             </div>

             <Button onClick={() => {
               if (navigator.share) {
                 navigator.share({
                   title: 'Check out this AI Video!',
                   text: `Created with NeoClip AI: "${shareVideo.prompt}"`,
                   url: `${window.location.origin}?v=${shareVideo.id}` // Use URL Link instead of blob
                 });
               }
             }} className="w-full" icon={Share2}>Share via...</Button>
           </div>
         </div>
       )}
    </div>
  );
};

export default App;