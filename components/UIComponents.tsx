import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Lock, Sparkles, Check, Image as ImageIcon, X, Zap, Gamepad2 } from 'lucide-react';

export const Button = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  disabled = false, 
  className = '',
  icon: Icon
}: { 
  onClick?: () => void, 
  children?: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost',
  disabled?: boolean,
  className?: string,
  icon?: React.ElementType
}) => {
  const baseStyles = "relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-cyan-400 to-purple-600 text-white shadow-lg shadow-purple-500/25",
    secondary: "bg-surface text-white border border-slate-700 hover:bg-slate-800",
    outline: "border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-950/30",
    ghost: "text-slate-400 hover:text-white hover:bg-white/5"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
};

export const InputArea = ({
  value,
  onChange,
  placeholder,
  label
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  label: string;
}) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-sm font-medium text-slate-400 ml-1">{label}</label>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full h-32 bg-surface/50 border border-slate-700 rounded-2xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none transition-all"
    />
  </div>
);

export const TextInput = ({
  value,
  onChange,
  placeholder,
  className = ''
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full bg-black/20 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all ${className}`}
  />
);

export const Toggle = ({ 
  checked, 
  onToggle, 
  disabled = false 
}: { 
  checked: boolean; 
  onToggle: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    className={`w-12 h-7 rounded-full p-1 transition-colors relative ${checked ? 'bg-cyan-500' : 'bg-slate-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

export const ImageUploader = ({ 
  onImageSelect, 
  selectedImage, 
  onClear,
  className = ''
}: { 
  onImageSelect: (base64: string) => void; 
  selectedImage: string | null;
  onClear: () => void;
  className?: string;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          // Remove data URL prefix safely
          const base64Data = result.split(',')[1];
          if (base64Data) {
            onImageSelect(base64Data);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (selectedImage) {
    return (
      <div className={`relative rounded-xl overflow-hidden border border-cyan-500 group ${className}`}>
        <img 
          src={`data:image/png;base64,${selectedImage}`} 
          alt="Selected" 
          className="w-full h-full object-cover" 
        />
        <button 
          onClick={onClear}
          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      className={`rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all flex flex-col items-center justify-center cursor-pointer group ${className}`}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      <ImageIcon className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 mb-1" />
      <span className="text-[10px] text-slate-500 group-hover:text-cyan-300">Add Photo</span>
    </div>
  );
};

export const Watermark = ({ text, visible }: { text: string; visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 pointer-events-none select-none z-10 animate-in fade-in duration-500">
      <p className="text-[10px] font-bold text-white/70 tracking-widest uppercase shadow-sm flex items-center gap-1">
        <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
        {text}
      </p>
    </div>
  );
};

export const LottieAnimation = ({ src, className = "w-full h-full" }: { src: string; className?: string }) => {
  const LottiePlayer = 'lottie-player' as any;
  return (
    <div className={className}>
      <LottiePlayer
        src={src}
        background="transparent"
        speed="1"
        style={{ width: '100%', height: '100%' }}
        loop
        autoplay
      ></LottiePlayer>
    </div>
  );
};

export const LoadingOverlay = ({ status, progress = 0 }: { status: string; progress?: number }) => (
  <div className="fixed inset-0 bg-darker/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
    <div className="relative mb-8 w-64 h-64 animate-float overflow-hidden rounded-2xl ring-1 ring-cyan-500/20 bg-slate-900/50">
       {/* Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
       
       <LottieAnimation src="https://lottie.host/93292416-8360-4929-9b48-356784013401/J0Xy2y2y2y.json" />
       
       {/* Scan */}
       <div className="absolute inset-0 w-full h-[50%] bg-gradient-to-b from-transparent via-purple-500/20 to-transparent animate-scan pointer-events-none"></div>
    </div>
    
    <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 animate-pulse relative z-10">
      NeoClip AI
    </h3>
    
    <div className="mt-8 w-64 space-y-2 relative z-10">
      <div className="flex justify-between text-xs text-slate-400 uppercase tracking-widest">
         <span>{status}</span>
         <span className="text-cyan-400">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
    
    <div className="mt-6 text-[10px] text-slate-600 uppercase tracking-[0.2em] relative z-10">
      Generating Viral Content
    </div>
  </div>
);

// New Fun/Gaming Style Overlay for Free Tier (Retro Theme)
export const FunLoadingOverlay = ({ status, progress = 0 }: { status: string; progress?: number }) => (
  <div className="fixed inset-0 bg-[#050505] z-50 flex flex-col items-center justify-center p-6 text-center font-pixel">
    {/* Background Pattern */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#333_1px,_transparent_1px)] bg-[size:20px_20px] opacity-20"></div>

    <div className="relative mb-8 w-64 h-64 animate-bounce">
       {/* Pixel Art Runner Lottie */}
       <LottieAnimation src="https://lottie.host/5d6360c7-2c93-4a16-832f-45b953833d73/a1Xg8y8y8y.json" /> 
    </div>
    
    <h3 className="text-3xl font-bold text-white mb-2 flex items-center gap-2 justify-center drop-shadow-md">
      <Gamepad2 className="w-8 h-8 text-retroRed animate-spin-slow" />
      <span className="text-retroRed">Level</span> <span className="text-retroBlue">Up!</span>
    </h3>
    
    <p className="text-xs text-retroYellow uppercase tracking-widest mb-8">Creating Movie Magic...</p>
    
    {/* Chunky Retro Progress Bar */}
    <div className="mt-4 w-64 space-y-2 relative z-10 mx-auto">
      <div className="flex justify-between text-xs text-slate-400 font-bold font-mono">
         <span>{status}</span>
         <span className="text-retroYellow">{Math.round(progress)}%</span>
      </div>
      <div className="h-6 w-full bg-slate-800 border-4 border-white rounded-none overflow-hidden relative shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
        <div 
          className="h-full bg-gradient-to-r from-retroRed via-retroYellow to-retroBlue transition-all duration-300 ease-steps(5)"
          style={{ width: `${progress}%` }}
        />
        {/* Shine effect */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 pointer-events-none"></div>
      </div>
    </div>
    
    {/* Scrolling Ticker Message */}
    <div className="absolute bottom-10 left-0 w-full overflow-hidden bg-retroBlue/20 border-y-4 border-retroBlue py-2 shadow-lg">
       <div className="whitespace-nowrap animate-marquee inline-block text-cyan-300 text-xs font-bold px-4 font-mono tracking-wider">
          PLEASE BE PATIENT - FREE VIDEO GENERATION MODELS ARE OFTEN OVERCROWDED. YOU MAY SWITCH TABS, BUT PLEASE KEEP THIS PAGE OPEN TO PREVENT DATA LOSS.  ***  GOOD THINGS COME TO THOSE WHO WAIT!  ***
       </div>
    </div>
  </div>
);

export const AdOverlay = ({ onComplete }: { onComplete: () => void }) => {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col items-center justify-center p-6">
      <div className="absolute top-4 right-4 bg-slate-800 px-4 py-2 rounded-full text-xs font-mono text-slate-300">
        Reward in {seconds}s
      </div>
      
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center">
           <span className="text-black font-bold text-xl">AD</span>
        </div>
        <h3 className="text-2xl font-bold text-white">Support NeoClip Free Tier</h3>
        <p className="text-slate-400 text-sm">
          Watch this short message to generate your video for free.
        </p>
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
           <div className="h-full bg-cyan-500 transition-all duration-1000 ease-linear" style={{ width: `${(1 - seconds/5) * 100}%` }}></div>
        </div>
      </div>
    </div>
  );
};

export const PremiumBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/20">
    <Sparkles className="w-3 h-3" />
    Pro
  </span>
);

export const LockOverlay = ({ onUnlock }: { onUnlock: () => void }) => (
  <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center rounded-2xl z-10 transition-opacity duration-300">
    <button onClick={onUnlock} className="flex flex-col items-center gap-2 group">
      <div className="p-3 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors border border-slate-600">
        <Lock className="w-6 h-6 text-slate-300 group-hover:text-cyan-400" />
      </div>
      <span className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Unlock Feature</span>
    </button>
  </div>
);

export const Toast = ({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isError = type === 'error';

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] animate-in slide-in-from-top-2 fade-in duration-300 pointer-events-none">
      <div className={`bg-surface/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl border ${isError ? 'border-red-500/20' : 'border-cyan-500/20'} flex items-center gap-3 pointer-events-auto`}>
        <div className={`${isError ? 'bg-red-500' : 'bg-cyan-500'} rounded-full p-1`}>
          {isError ? <X className="w-3 h-3 text-white" /> : <Check className="w-3 h-3 text-black" />}
        </div>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

export const IdeaOverlay = () => (
  <div className="absolute top-full right-0 mt-2 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-3 shadow-xl z-20 w-48 animate-in fade-in slide-in-from-top-2 pointer-events-none">
    <div className="flex items-center gap-2 mb-2">
      <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Brainstorming...</span>
    </div>
    <div className="space-y-1.5 opacity-50">
      <div className="h-1.5 bg-slate-600 rounded-full animate-pulse w-3/4" />
      <div className="h-1.5 bg-slate-600 rounded-full animate-pulse w-1/2" />
      <div className="h-1.5 bg-slate-600 rounded-full animate-pulse w-2/3" />
    </div>
  </div>
);