import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, Upload, Link as LinkIcon, RotateCw, RotateCcw, FlipHorizontal, 
  FlipVertical, Sliders, Crop, Sparkles, Check, X, Trash2, Star, Eye,
  Maximize2, RefreshCw, ZoomIn, ZoomOut, Sun, Contrast, Palette,
  Image as ImageIcon, Layers, AlertCircle, ArrowLeft, ArrowRight, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../services/imageCompressor';

// Sample product presets for fast testing & prototyping
export const SAMPLE_PRODUCT_PRESETS = [
  { name: 'টি-শার্ট (T-Shirt)', category: 'fashion', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80' },
  { name: 'জিন্স প্যান্ট (Jeans)', category: 'fashion', url: 'https://images.unsplash.com/photo-1542272604-780c96856453?w=600&auto=format&fit=crop&q=80' },
  { name: 'স্নিকার্স জুতো (Shoes)', category: 'fashion', url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80' },
  { name: 'স্মার্টফোন (Phone)', category: 'electronics', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80' },
  { name: 'হেডফোন (Headphone)', category: 'electronics', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80' },
  { name: 'স্মার্টওয়াচ (Watch)', category: 'electronics', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80' },
  { name: 'চায়ের পাতা / কফি (Coffee/Tea)', category: 'grocery', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80' },
  { name: 'অর্গানিক জুস (Juice)', category: 'grocery', url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=80' },
  { name: 'মধু / জার (Honey Jar)', category: 'grocery', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80' },
  { name: 'স্কিন কেয়ার সিরাম (Serum)', category: 'cosmetics', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80' },
  { name: 'সুগন্ধি / পারফিউম (Perfume)', category: 'cosmetics', url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80' },
  { name: 'কাঁচামাল তুলা / ফাইবার (Cotton)', category: 'raw_material', url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600&auto=format&fit=crop&q=80' },
  { name: 'কাঁচা সুতা / থ্রেড (Thread)', category: 'raw_material', url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=80' },
  { name: 'প্যাকেজিং বক্স (Box)', category: 'raw_material', url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80' }
];

export interface ImageEditorState {
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  aspectRatio: '1:1' | '4:3' | '16:9' | '3:4' | 'free';
  filter: 'normal' | 'auto_enhance' | 'studio_clean' | 'warm' | 'cool' | 'grayscale' | 'sepia' | 'vivid';
  zoom: number; // 1 to 3
}

const DEFAULT_EDITOR_STATE: ImageEditorState = {
  rotation: 0,
  flipH: false,
  flipV: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  aspectRatio: '1:1',
  filter: 'normal',
  zoom: 1
};

// =========================================================================
// 1. ADVANCED PHOTO EDITOR MODAL (CANVAS-BASED REAL-TIME FILTER & ADJUST)
// =========================================================================
interface PhotoEditorModalProps {
  initialImage: string;
  onSave: (editedDataUrl: string) => void;
  onClose: () => void;
  title?: string;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  initialImage,
  onSave,
  onClose,
  title = 'পণ্য ছবি এডিটর ও প্রসেসর'
}) => {
  const [editorState, setEditorState] = useState<ImageEditorState>(DEFAULT_EDITOR_STATE);
  const [activeTool, setActiveTool] = useState<'transform' | 'filters' | 'adjust' | 'crop'>('transform');
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  // Load Source Image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceImageRef.current = img;
      setImageLoaded(true);
      renderCanvas();
    };
    img.onerror = () => {
      // If crossOrigin blocked by CORS, retry without crossOrigin for data URLs
      if (initialImage.startsWith('data:')) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          sourceImageRef.current = fallbackImg;
          setImageLoaded(true);
          renderCanvas();
        };
        fallbackImg.src = initialImage;
      }
    };
    img.src = initialImage;
  }, [initialImage]);

  // Re-render canvas whenever editor state updates
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = sourceImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine target canvas dimensions based on aspect ratio (optimized for sharp display & minimal document payload)
    let targetWidth = 600;
    let targetHeight = 600;

    if (editorState.aspectRatio === '4:3') {
      targetWidth = 600;
      targetHeight = 450;
    } else if (editorState.aspectRatio === '16:9') {
      targetWidth = 600;
      targetHeight = 338;
    } else if (editorState.aspectRatio === '3:4') {
      targetWidth = 450;
      targetHeight = 600;
    } else if (editorState.aspectRatio === 'free') {
      const origAspect = img.width / img.height;
      if (origAspect >= 1) {
        targetWidth = 600;
        targetHeight = Math.round(600 / origAspect);
      } else {
        targetHeight = 600;
        targetWidth = Math.round(600 * origAspect);
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Clear
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Apply Filter CSS string
    let brightnessVal = 100 + editorState.brightness;
    let contrastVal = 100 + editorState.contrast;
    let saturateVal = 100 + editorState.saturation;
    let grayscaleVal = 0;
    let sepiaVal = 0;

    if (editorState.filter === 'auto_enhance') {
      brightnessVal += 10;
      contrastVal += 20;
      saturateVal += 25;
    } else if (editorState.filter === 'studio_clean') {
      brightnessVal += 15;
      contrastVal += 10;
      saturateVal += 10;
    } else if (editorState.filter === 'warm') {
      brightnessVal += 5;
      saturateVal += 20;
      sepiaVal += 20;
    } else if (editorState.filter === 'cool') {
      brightnessVal += 5;
      contrastVal += 10;
      saturateVal += 10;
    } else if (editorState.filter === 'grayscale') {
      grayscaleVal = 100;
      contrastVal += 10;
    } else if (editorState.filter === 'sepia') {
      sepiaVal = 80;
      contrastVal += 10;
    } else if (editorState.filter === 'vivid') {
      contrastVal += 25;
      saturateVal += 50;
    }

    ctx.filter = `brightness(${brightnessVal}%) contrast(${contrastVal}%) saturate(${saturateVal}%) grayscale(${grayscaleVal}%) sepia(${sepiaVal}%)`;

    // Save context state for transformations
    ctx.save();

    // Center transformation point
    ctx.translate(targetWidth / 2, targetHeight / 2);

    // Rotation
    ctx.rotate((editorState.rotation * Math.PI) / 180);

    // Flip
    const scaleX = (editorState.flipH ? -1 : 1) * editorState.zoom;
    const scaleY = (editorState.flipV ? -1 : 1) * editorState.zoom;
    ctx.scale(scaleX, scaleY);

    // Calculate image drawing dimensions to cover / fit nicely
    const imgAspect = img.width / img.height;
    const canvasAspect = targetWidth / targetHeight;
    let drawW: number, drawH: number;

    if (editorState.rotation % 180 !== 0) {
      // Swapped dimensions when rotated 90 or 270 deg
      if (imgAspect > 1) {
        drawH = targetWidth;
        drawW = targetWidth * imgAspect;
      } else {
        drawW = targetHeight;
        drawH = targetHeight / imgAspect;
      }
    } else {
      if (imgAspect > canvasAspect) {
        drawH = targetHeight;
        drawW = targetHeight * imgAspect;
      } else {
        drawW = targetWidth;
        drawH = targetWidth / imgAspect;
      }
    }

    // Draw centered
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    // Restore context
    ctx.restore();
  }, [editorState]);

  useEffect(() => {
    if (imageLoaded) {
      renderCanvas();
    }
  }, [editorState, imageLoaded, renderCanvas]);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        // Export as compressed high quality JPEG (quality 0.75)
        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        const compressed = await compressImage(rawDataUrl, { maxWidth: 600, maxHeight: 600, quality: 0.72 });
        onSave(compressed);
      } else {
        onSave(initialImage);
      }
    } catch (err) {
      console.error("Canvas export failed:", err);
      onSave(initialImage);
    } finally {
      setIsProcessing(false);
    }
  };

  const rotateRight = () => {
    setEditorState(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  };

  const rotateLeft = () => {
    setEditorState(prev => ({ ...prev, rotation: (prev.rotation - 90 + 360) % 360 }));
  };

  const toggleFlipH = () => {
    setEditorState(prev => ({ ...prev, flipH: !prev.flipH }));
  };

  const toggleFlipV = () => {
    setEditorState(prev => ({ ...prev, flipV: !prev.flipV }));
  };

  const resetAll = () => {
    setEditorState(DEFAULT_EDITOR_STATE);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-[36px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 text-primary border border-primary/30 rounded-2xl">
              <Crop size={20}/>
            </div>
            <div>
              <h3 className="font-black text-white text-base tracking-tight">{title}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                রোটেশন, ক্রপ, ব্রাইটনেস ও কালার ফিল্টার টুল
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={resetAll}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
              title="সব পরিবর্তন রিসেট করুন"
            >
              <RefreshCw size={14}/> রিসেট
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-all"
            >
              <X size={20}/>
            </button>
          </div>
        </div>

        {/* Editor Main Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[420px] overflow-hidden">
          {/* Canvas Viewport (Center / Left) */}
          <div className="lg:col-span-8 p-6 bg-slate-950/60 flex flex-col items-center justify-center relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className="relative max-w-full max-h-[450px] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900/50">
              <canvas 
                ref={canvasRef} 
                className="max-h-[380px] w-auto object-contain rounded-xl transition-all"
              />
              
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="animate-spin text-primary" size={28}/>
                    <span className="text-xs font-bold text-slate-400">ছবি প্রস্তুত হচ্ছে...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Canvas Overlay Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800">
              <button 
                onClick={rotateLeft} 
                className="p-2 text-slate-300 hover:text-primary hover:bg-slate-800 rounded-xl transition-all" 
                title="৯০° বামে ঘোরান"
              >
                <RotateCcw size={16}/>
              </button>
              <button 
                onClick={rotateRight} 
                className="p-2 text-slate-300 hover:text-primary hover:bg-slate-800 rounded-xl transition-all" 
                title="৯০° ডানে ঘোরান"
              >
                <RotateCw size={16}/>
              </button>
              <div className="w-[1px] h-5 bg-slate-800 mx-1"></div>
              <button 
                onClick={toggleFlipH} 
                className={`p-2 rounded-xl transition-all ${editorState.flipH ? 'bg-primary text-white' : 'text-slate-300 hover:text-primary hover:bg-slate-800'}`} 
                title="আড়াআড়ি ফ্লিপ"
              >
                <FlipHorizontal size={16}/>
              </button>
              <button 
                onClick={toggleFlipV} 
                className={`p-2 rounded-xl transition-all ${editorState.flipV ? 'bg-primary text-white' : 'text-slate-300 hover:text-primary hover:bg-slate-800'}`} 
                title="উল্লম্ব ফ্লিপ"
              >
                <FlipVertical size={16}/>
              </button>
              <div className="w-[1px] h-5 bg-slate-800 mx-1"></div>
              {/* Zoom control */}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold px-2">
                <ZoomOut size={14}/>
                <input 
                  type="range" 
                  min="1" 
                  max="2.5" 
                  step="0.1"
                  value={editorState.zoom} 
                  onChange={e => setEditorState(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                  className="w-20 accent-primary cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <ZoomIn size={14}/>
                <span className="text-[10px] w-8 text-right text-slate-300">{Math.round(editorState.zoom * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Controls Sidebar (Right) */}
          <div className="lg:col-span-4 p-6 bg-slate-900 flex flex-col justify-between overflow-y-auto custom-scrollbar max-h-[500px] lg:max-h-none">
            <div className="space-y-6">
              {/* Tool Selector Tabs */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button 
                  onClick={() => setActiveTool('transform')}
                  className={`py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${activeTool === 'transform' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Crop size={14}/> ক্রপ / সাইজ
                </button>
                <button 
                  onClick={() => setActiveTool('adjust')}
                  className={`py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${activeTool === 'adjust' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Sliders size={14}/> আলো ও রং
                </button>
                <button 
                  onClick={() => setActiveTool('filters')}
                  className={`py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${activeTool === 'filters' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Sparkles size={14}/> ফিল্টার
                </button>
                <button 
                  onClick={() => setActiveTool('crop')}
                  className={`py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${activeTool === 'crop' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Palette size={14}/> প্রিভিউ
                </button>
              </div>

              {/* TAB CONTENT: TRANSFORM / ASPECT RATIO */}
              {activeTool === 'transform' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      📐 ফ্রেম ও অ্যাসপেক্ট রেশিও (Aspect Ratio)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: '1:1', label: '1:1 Square', desc: 'স্টোর ও POS স্কয়ার' },
                        { id: '4:3', label: '4:3 Standard', desc: 'সাধারণ পণ্য ফ্রেম' },
                        { id: '16:9', label: '16:9 Wide', desc: 'ব্যানার ও ল্যান্ডস্কেপ' },
                        { id: '3:4', label: '3:4 Portrait', desc: 'ফ্যাশন ও লম্বা পণ্য' },
                        { id: 'free', label: 'Original', desc: 'মূল ছবির অনুপাত' }
                      ].map(r => (
                        <button
                          key={r.id}
                          onClick={() => setEditorState(prev => ({ ...prev, aspectRatio: r.id as any }))}
                          className={`p-3 rounded-2xl border text-left transition-all ${editorState.aspectRatio === r.id ? 'border-primary bg-primary/10 text-white shadow-sm' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'}`}
                        >
                          <span className="font-bold text-xs block text-white">{r.label}</span>
                          <span className="text-[9px] text-slate-400">{r.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} className="text-primary"/> স্মার্ট অটো-ফিট
                    </span>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                      ই-কমার্স স্টোর এবং পয়েন্ট অব সেলে সুন্দরভাবে প্রদর্শনের জন্য <strong className="text-primary">1:1 Square</strong> রেশিও সবচেয়ে উপযুক্ত।
                    </p>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: ADJUSTMENTS (SLIDERS) */}
              {activeTool === 'adjust' && (
                <div className="space-y-5">
                  {/* Brightness */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Sun size={14} className="text-amber-400"/> উজ্জ্বলতা (Brightness)
                      </span>
                      <span className="text-slate-400 text-[11px]">{editorState.brightness > 0 ? `+${editorState.brightness}` : editorState.brightness}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="-60" 
                      max="60" 
                      value={editorState.brightness} 
                      onChange={e => setEditorState(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                      className="w-full accent-primary bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Contrast size={14} className="text-indigo-400"/> কনট্রাস্ট (Contrast)
                      </span>
                      <span className="text-slate-400 text-[11px]">{editorState.contrast > 0 ? `+${editorState.contrast}` : editorState.contrast}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="-60" 
                      max="60" 
                      value={editorState.contrast} 
                      onChange={e => setEditorState(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                      className="w-full accent-primary bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Palette size={14} className="text-rose-400"/> রঙের ঘনত্ব (Saturation)
                      </span>
                      <span className="text-slate-400 text-[11px]">{editorState.saturation > 0 ? `+${editorState.saturation}` : editorState.saturation}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="-80" 
                      max="80" 
                      value={editorState.saturation} 
                      onChange={e => setEditorState(prev => ({ ...prev, saturation: parseInt(e.target.value) }))}
                      className="w-full accent-primary bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* TAB CONTENT: FILTERS */}
              {activeTool === 'filters' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    ✨ এক-ক্লিক ফটো স্টুডিও ফিল্টার
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'normal', name: 'স্বাভাবিক (Normal)', desc: 'মূল ছবি' },
                      { id: 'auto_enhance', name: 'অটো ইনহ্যান্স', desc: 'ভিভিড ও স্পষ্ট আলো' },
                      { id: 'studio_clean', name: 'স্টুডিও ক্লিন', desc: 'উজ্জ্বল প্রোডাক্ট শট' },
                      { id: 'vivid', name: 'ভিভিড কালার', desc: 'উজ্জ্বল আকর্ষণীয় রঙ' },
                      { id: 'warm', name: 'ওয়ার্ম টোন', desc: 'উষ্ণ আমেজ' },
                      { id: 'cool', name: 'কুল ক্রিস্প', desc: 'শীতল ও শার্প' },
                      { id: 'grayscale', name: 'ব্ল্যাক & হোয়াইট', desc: 'মোনোক্রোম' },
                      { id: 'sepia', name: 'ভিন্টেজ সেপিয়া', desc: 'রেট্রো লুক' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setEditorState(prev => ({ ...prev, filter: f.id as any }))}
                        className={`p-3 rounded-2xl border text-left transition-all ${editorState.filter === f.id ? 'border-primary bg-primary/15 text-white shadow-sm' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'}`}
                      >
                        <span className="font-bold text-xs block text-white">{f.name}</span>
                        <span className="text-[9px] text-slate-400">{f.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PREVIEW & INFO */}
              {activeTool === 'crop' && (
                <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Shield size={14} className="text-emerald-400"/> হাই-স্পিড অপ্টিমাইজেশন
                  </h4>
                  <ul className="text-[11px] text-slate-300 space-y-2 font-medium">
                    <li className="flex items-center gap-1.5">
                      <Check size={14} className="text-emerald-400 shrink-0"/> স্বয়ংক্রিয় 800x800 ম্যাক্সিমাম সাইজ কম্প্রেশন
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={14} className="text-emerald-400 shrink-0"/> সাইজ কমানো হয়েছে (~30-60 KB) যাতে দ্রুত লোড হয়
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={14} className="text-emerald-400 shrink-0"/> ইনভয়েস, POS ও অনলাইন স্টোরে ক্রিস্টাল ক্লিয়ার দেখাবে
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-6 mt-6 border-t border-slate-800 flex items-center gap-3">
              <button 
                onClick={onClose}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                বাতিল
              </button>
              <button 
                onClick={handleSave}
                disabled={isProcessing || !imageLoaded}
                className="flex-1 bg-primary hover:bg-primary/90 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={16}/> : <Check size={16}/>}
                সেভ করুন
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// =========================================================================
// 2. LIVE CAMERA CAPTURE MODAL (CAPTURE PHOTOS VIA WEBCAM / PHONE CAMERA)
// =========================================================================
interface CameraCaptureModalProps {
  onCapture: (capturedDataUrl: string) => void;
  onClose: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ onCapture, onClose }) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraError, setHasCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    try {
      setHasCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setHasCameraError("ক্যামেরা চালু করা সম্ভব হয়নি। অনুগ্রহ করে ব্রাউজার ক্যামেরা পারমিশন চেক করুন।");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const snapPhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    setFlash(true);

    setTimeout(async () => {
      setFlash(false);
      try {
        const video = videoRef.current;
        if (!video) return;

        const maxDim = 600;
        let w = video.videoWidth || 600;
        let h = video.videoHeight || 600;
        if (w > maxDim || h > maxDim) {
          const r = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(video, 0, 0, w, h);
          const rawDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const compressed = await compressImage(rawDataUrl, { maxWidth: 600, maxHeight: 600, quality: 0.72 });
          
          // Stop stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          onCapture(compressed);
        }
      } catch (err) {
        console.error("Snap photo failed:", err);
      } finally {
        setIsCapturing(false);
      }
    }, 150);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[210] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-[36px] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <Camera size={20}/>
            </div>
            <div>
              <h3 className="font-black text-white text-sm uppercase tracking-wide">ক্যামেরা দিয়ে পণ্যের ছবি তুলুন</h3>
              <p className="text-[10px] text-slate-400">লাইভ ভিউফাইন্ডার থেকে সরাসরি ছবি ক্যাপচার</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* Viewfinder */}
        <div className="relative aspect-square sm:aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          <video 
            ref={videoRef} 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />

          {/* Flash Effect */}
          {flash && <div className="absolute inset-0 bg-white z-20 animate-fade-out pointer-events-none"></div>}

          {/* Viewfinder Target Guidelines */}
          <div className="absolute inset-8 sm:inset-12 border-2 border-white/40 border-dashed rounded-3xl pointer-events-none flex items-center justify-center">
            <div className="w-12 h-12 border-t-2 border-l-2 border-white absolute top-0 left-0 rounded-tl-2xl"></div>
            <div className="w-12 h-12 border-t-2 border-r-2 border-white absolute top-0 right-0 rounded-tr-2xl"></div>
            <div className="w-12 h-12 border-b-2 border-l-2 border-white absolute bottom-0 left-0 rounded-bl-2xl"></div>
            <div className="w-12 h-12 border-b-2 border-r-2 border-white absolute bottom-0 right-0 rounded-br-2xl"></div>
          </div>

          {/* Error display */}
          {hasCameraError && (
            <div className="absolute inset-0 bg-slate-900/90 p-8 flex flex-col items-center justify-center text-center">
              <AlertCircle size={40} className="text-rose-400 mb-3"/>
              <p className="text-sm font-bold text-white max-w-xs">{hasCameraError}</p>
              <button 
                onClick={startCamera}
                className="mt-4 bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold"
              >
                আবার চেষ্টা করুন
              </button>
            </div>
          )}
        </div>

        {/* Camera Footer Controls */}
        <div className="p-6 bg-slate-900 flex items-center justify-around border-t border-slate-800">
          <button 
            onClick={switchCamera} 
            className="p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="ক্যামেরা পরিবর্তন (সামনে / পেছনে)"
          >
            <RefreshCw size={20}/>
          </button>

          {/* Big Shutter Button */}
          <button 
            onClick={snapPhoto}
            disabled={isCapturing || !!hasCameraError}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white/80 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl bg-slate-950"
            title="ছবি তুলুন"
          >
            <div className="w-full h-full rounded-full bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center text-white">
              <Camera size={26}/>
            </div>
          </button>

          <button 
            onClick={onClose} 
            className="p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs font-bold"
          >
            বাতিল
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// =========================================================================
// 3. PRODUCT PHOTO STUDIO (INTEGRATED PHOTO MANAGER, GALLERY, AND TRIGGER)
// =========================================================================
interface ProductPhotoStudioProps {
  primaryImage?: string;
  galleryImages?: string[];
  onChange: (primary: string, gallery: string[]) => void;
  productName?: string;
}

export const ProductPhotoStudio: React.FC<ProductPhotoStudioProps> = ({
  primaryImage = '',
  galleryImages = [],
  onChange,
  productName = 'পণ্য'
}) => {
  // Sync internal array with props
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (primaryImage) list.push(primaryImage);
    if (galleryImages && galleryImages.length > 0) {
      galleryImages.forEach(img => {
        if (img && !list.includes(img)) list.push(img);
      });
    }
    return list;
  }, [primaryImage, galleryImages]);

  const [activeImageToEdit, setActiveImageToEdit] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showUrlInputModal, setShowUrlInputModal] = useState(false);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [previewLightboxIndex, setPreviewLightboxIndex] = useState<number | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handlers (Supports Multi-select & Drag-and-drop with instant compression)
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileList.length === 0) {
      alert("শুধুমাত্র ছবি (JPG, PNG, WEBP ইত্যাদি) আপলোড করা যাবে।");
      return;
    }

    setIsUploading(true);
    try {
      const compressedList: string[] = [];
      for (const file of fileList) {
        try {
          const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.72 });
          if (compressed) compressedList.push(compressed);
        } catch (err) {
          console.warn("Could not compress file:", file.name, err);
        }
      }

      if (compressedList.length > 0) {
        if (allImages.length === 0 && compressedList.length === 1) {
          // Immediately prompt editor on single first upload
          setActiveImageToEdit(compressedList[0]);
        } else {
          const updated = [...allImages, ...compressedList].slice(0, 6);
          onChange(updated[0] || '', updated.slice(1));
        }
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    setShowUrlInputModal(false);
    setUrlInput('');
    setActiveImageToEdit(url);
  };

  const handlePresetSelect = (presetUrl: string) => {
    setShowPresetsModal(false);
    setActiveImageToEdit(presetUrl);
  };

  const handleEditorSave = (editedDataUrl: string) => {
    let updated: string[];
    // If editing existing item
    const existingIndex = allImages.findIndex(img => img === activeImageToEdit);
    if (existingIndex >= 0) {
      updated = [...allImages];
      updated[existingIndex] = editedDataUrl;
    } else {
      // Add new
      updated = [editedDataUrl, ...allImages];
    }

    setActiveImageToEdit(null);
    onChange(updated[0] || '', updated.slice(1));
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const item = allImages[index];
    const rest = allImages.filter((_, i) => i !== index);
    const updated = [item, ...rest];
    onChange(updated[0], updated.slice(1));
  };

  const handleDeleteImage = (index: number) => {
    const updated = allImages.filter((_, i) => i !== index);
    onChange(updated[0] || '', updated.slice(1));
  };

  return (
    <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 space-y-4">
      {/* Hidden File Input */}
      <input 
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {/* Header with Quick Action Pills */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <ImageIcon size={16} className="text-primary"/> পণ্যের ছবি ও ফটো গ্যালারি ({allImages.length})
          </label>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            কম্পিউটার/মোবাইল থেকে আপলোড, সরাসরি ক্যামেরা দিয়ে ছবি তোলা অথবা ছবি ক্রপ/এডিট করুন
          </p>
        </div>

        {/* Source Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-white hover:bg-primary hover:text-white text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5"
            title="ডিভাইস থেকে ছবি আপলোড"
          >
            <Upload size={14}/> ফাইল আপলোড
          </button>

          <button
            type="button"
            onClick={() => setShowCameraModal(true)}
            className="bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5"
            title="ক্যামেরা দিয়ে ছবি তুলুন"
          >
            <Camera size={14}/> ক্যামেরা
          </button>

          <button
            type="button"
            onClick={() => setShowUrlInputModal(true)}
            className="bg-white hover:bg-indigo-600 hover:text-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            title="ইমেজ লিঙ্ক / URL"
          >
            <LinkIcon size={13}/> লিঙ্ক
          </button>

          <button
            type="button"
            onClick={() => setShowPresetsModal(true)}
            className="bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-700 border border-amber-200 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            title="স্যাম্পল প্রোডাক্ট ফটো"
          >
            <Sparkles size={13}/> স্যাম্পল
          </button>
        </div>
      </div>

      {/* Main Image Grid / Dropzone */}
      {allImages.length === 0 ? (
        <div 
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-primary bg-white/70 hover:bg-white p-8 rounded-3xl text-center cursor-pointer transition-all group flex flex-col items-center justify-center space-y-3"
        >
          <div className="w-16 h-16 bg-primary/10 group-hover:bg-primary group-hover:text-white text-primary rounded-2xl flex items-center justify-center transition-all shadow-sm">
            <Upload size={28}/>
          </div>
          <div>
            <h4 className="font-black text-slate-700 text-sm group-hover:text-primary transition-colors">
              পণ্যের ছবি এখানে ড্রপ করুন অথবা ক্লিক করে আপলোড করুন
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              JPG, PNG, WEBP ফরম্যাট সমর্থিত। একাধিক ছবিও যুক্ত করতে পারেন।
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {allImages.map((img, idx) => {
            const isPrimary = idx === 0;
            return (
              <div 
                key={idx}
                className={`group relative aspect-square rounded-2xl bg-white border-2 overflow-hidden shadow-sm transition-all hover:shadow-md ${isPrimary ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'}`}
              >
                <img 
                  src={img} 
                  alt={`${productName} ${idx + 1}`}
                  className="w-full h-full object-contain p-2"
                />

                {/* Primary Photo Badge */}
                {isPrimary ? (
                  <div className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <Star size={10} className="fill-white"/> প্রধান ছবি
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(idx)}
                    className="absolute top-2 left-2 bg-slate-900/70 hover:bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                    title="প্রধান ছবি হিসেবে নির্ধারণ করুন"
                  >
                    <Star size={10}/> প্রধান করুন
                  </button>
                )}

                {/* Hover Overlay Action Toolbar */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 p-2 backdrop-blur-[2px]">
                  <button
                    type="button"
                    onClick={() => setActiveImageToEdit(img)}
                    className="p-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg transition-transform hover:scale-110"
                    title="ছবি এডিট করুন (ক্রপ, রোটেশন, ফিল্টার)"
                  >
                    <Sliders size={16}/>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewLightboxIndex(idx)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-lg transition-transform hover:scale-110"
                    title="বড় করে প্রিভিউ দেখুন"
                  >
                    <Eye size={16}/>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteImage(idx)}
                    className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg transition-transform hover:scale-110"
                    title="ছবি মুছে ফেলুন"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add more slot button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary bg-white/60 hover:bg-white flex flex-col items-center justify-center p-4 text-slate-400 hover:text-primary transition-all group"
          >
            <div className="p-3 bg-slate-100 group-hover:bg-primary/10 rounded-xl mb-1 transition-colors">
              <Upload size={20}/>
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider">+ আরো ছবি</span>
          </button>
        </div>
      )}

      {/* 1. PHOTO EDITOR MODAL */}
      {activeImageToEdit && (
        <PhotoEditorModal
          initialImage={activeImageToEdit}
          onSave={handleEditorSave}
          onClose={() => setActiveImageToEdit(null)}
          title={`${productName} - ফটো এডিটর ও স্টুডিও`}
        />
      )}

      {/* 2. CAMERA CAPTURE MODAL */}
      {showCameraModal && (
        <CameraCaptureModal
          onCapture={(capturedDataUrl) => {
            setShowCameraModal(false);
            setActiveImageToEdit(capturedDataUrl);
          }}
          onClose={() => setShowCameraModal(false)}
        />
      )}

      {/* 3. URL INPUT MODAL */}
      {showUrlInputModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[210] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-100"
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <LinkIcon size={20}/>
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase">ইন্টারনেট থেকে ছবির লিঙ্ক (URL) দিন</h3>
              </div>
              <button onClick={() => setShowUrlInputModal(false)} className="text-slate-400 hover:text-rose-500">
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  ইমেজ URL লিঙ্ক পেস্ট করুন *
                </label>
                <input 
                  type="url"
                  required
                  placeholder="https://example.com/product-image.jpg"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-2xl p-4 font-bold text-xs bg-slate-50 outline-none focus:bg-white focus:border-primary text-slate-700"
                />
              </div>

              {urlInput && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <img src={urlInput} alt="Preview" className="w-12 h-12 object-cover rounded-xl bg-white border" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <span className="text-[11px] font-bold text-slate-600 line-clamp-1">{urlInput}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowUrlInputModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs uppercase"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  ছবি লোড ও এডিট করুন
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 4. PRESETS MODAL */}
      {showPresetsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[210] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white rounded-[36px] w-full max-w-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col"
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Sparkles size={20}/>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase">রেডিমেড স্টক পণ্যের স্যাম্পল ছবি</h3>
                  <p className="text-[10px] text-slate-400 font-bold">ক্লিক করে আপনার পণ্যের সাথে ব্যবহার করুন</p>
                </div>
              </div>
              <button onClick={() => setShowPresetsModal(false)} className="text-slate-400 hover:text-rose-500">
                <X size={20}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
              {SAMPLE_PRODUCT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(preset.url)}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 hover:border-primary transition-all text-left shadow-sm hover:shadow-md"
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex flex-col justify-end p-3">
                    <span className="text-white text-xs font-black line-clamp-1">{preset.name}</span>
                    <span className="text-[9px] text-amber-300 font-bold uppercase">{preset.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* 5. LIGHTBOX FULLSCREEN PREVIEW */}
      {previewLightboxIndex !== null && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[220] flex items-center justify-center p-4">
          <button 
            onClick={() => setPreviewLightboxIndex(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
          >
            <X size={24}/>
          </button>

          {allImages.length > 1 && (
            <>
              <button 
                onClick={() => setPreviewLightboxIndex((previewLightboxIndex - 1 + allImages.length) % allImages.length)}
                className="absolute left-4 sm:left-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <ArrowLeft size={24}/>
              </button>
              <button 
                onClick={() => setPreviewLightboxIndex((previewLightboxIndex + 1) % allImages.length)}
                className="absolute right-4 sm:right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <ArrowRight size={24}/>
              </button>
            </>
          )}

          <div className="max-w-2xl max-h-[80vh] flex flex-col items-center justify-center">
            <img 
              src={allImages[previewLightboxIndex]} 
              alt="Preview" 
              className="max-h-[70vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-white/70 font-bold">
                ছবি {previewLightboxIndex + 1} / {allImages.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  const img = allImages[previewLightboxIndex];
                  setPreviewLightboxIndex(null);
                  setActiveImageToEdit(img);
                }}
                className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5"
              >
                <Sliders size={14}/> এই ছবি এডিট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
