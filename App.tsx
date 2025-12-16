import React, { useState } from 'react';
import { ThreeDView } from './components/ThreeDView';
import { Slider } from './components/Slider';
import { Button } from './components/Button';
import { Uploader } from './components/Uploader';
import { INITIAL_WALLPAPERS, DEFAULT_SETTINGS } from './constants';
import { Wallpaper, WallpaperSettings } from './types';
import { Layers, Settings2, Image as ImageIcon, Sparkles, Smartphone, X, Share, Menu, Wand2, Loader2, Power } from 'lucide-react';
import { detectSubjectLocation, blobToBase64 } from './utils/gemini';

export default function App() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>(INITIAL_WALLPAPERS);
  const [activeWallpaper, setActiveWallpaper] = useState<Wallpaper>(INITIAL_WALLPAPERS[0]);
  const [settings, setSettings] = useState<WallpaperSettings>(DEFAULT_SETTINGS);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDepthEnabled, setIsDepthEnabled] = useState(true); // Toggle for the mode

  const handleImageUpload = (url: string, name: string) => {
    const newWallpaper: Wallpaper = {
      id: Date.now().toString(),
      url,
      name,
    };
    setWallpapers(prev => [newWallpaper, ...prev]);
    setActiveWallpaper(newWallpaper);
  };

  const updateSetting = (key: keyof WallpaperSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSetWallpaperClick = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setIsFullscreen(true);
    } else {
      setShowInstallModal(true);
    }
  };

  const handleGenerateDepth = async () => {
    if (!activeWallpaper.url) return;

    setIsGenerating(true);
    try {
      // 1. Fetch image
      const response = await fetch(activeWallpaper.url);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      // 2. Ask Gemini where the subject is
      const coords = await detectSubjectLocation(base64);
      
      // 3. Generate a Smart Depth Mask based on Gemini's coordinates
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
         // Clear with black (far)
         ctx.fillStyle = "black";
         ctx.fillRect(0, 0, 512, 512);

         // Calculate center and size of the subject based on 0-100 coords
         const width = coords.xmax - coords.xmin;
         const height = coords.ymax - coords.ymin;
         const cx = (coords.xmin + width/2) * 5.12; // Convert 0-100 to 0-512
         const cy = (coords.ymin + height/2) * 5.12;
         const radius = Math.max(width, height) * 2.5; // Approximation radius

         // Draw a soft gradient at the subject's location
         const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius * 1.5);
         grad.addColorStop(0, "white"); // Close (Subject)
         grad.addColorStop(0.5, "#808080"); // Mid
         grad.addColorStop(1, "black"); // Far (Background)
         
         ctx.fillStyle = grad;
         // Draw an ellipse roughly matching the bounding box ratio
         ctx.beginPath();
         ctx.ellipse(cx, cy, (width * 3), (height * 3), 0, 0, 2 * Math.PI);
         ctx.fill();
      }
      const smartDepthUrl = canvas.toDataURL();
      
      const updatedWallpaper = { ...activeWallpaper, depthMapUrl: smartDepthUrl };
      setWallpapers(prev => prev.map(wp => wp.id === activeWallpaper.id ? updatedWallpaper : wp));
      setActiveWallpaper(updatedWallpaper);
      setIsDepthEnabled(true); // Auto-enable when generated

    } catch (err) {
      console.error("Failed to generate depth", err);
      alert("Could not analyze image. Please check connectivity.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleDepthMode = () => {
    setIsDepthEnabled(!isDepthEnabled);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col md:flex-row font-sans overflow-hidden">
      
      <aside className={`
        fixed md:relative z-40 bg-gray-900 border-r border-gray-800 w-full md:w-96 h-full flex flex-col transition-transform duration-300 ease-in-out
        ${isFullscreen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-800 flex items-center gap-3 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Layers className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              DepthFX
            </h1>
            <p className="text-xs text-gray-500">3D Wallpaper Engine</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          <section>
            <Button 
              className="w-full py-4 text-lg shadow-blue-900/20"
              icon={<Smartphone size={24} />}
              onClick={handleSetWallpaperClick}
            >
              Set as Wallpaper
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Use as an interactive mobile wallpaper
            </p>
          </section>

          {/* AI Depth Generation Section */}
          <section className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-4 rounded-xl border border-indigo-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm tracking-wider uppercase">
                <Wand2 size={16} />
                <span>AI Depth Engine</span>
              </div>
              {activeWallpaper.depthMapUrl && (
                <button 
                  onClick={toggleDepthMode}
                  className={`text-xs px-2 py-1 rounded font-bold transition-colors ${isDepthEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}
                >
                  {isDepthEnabled ? 'ON' : 'OFF'}
                </button>
              )}
            </div>
            
            <p className="text-xs text-gray-400 mb-4">
              Uses Google Gemini to detect the subject and apply realistic 3D relief.
            </p>
            
            <div className="flex flex-col gap-2">
              <Button 
                variant="primary" 
                className={`w-full bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/50 relative overflow-hidden`}
                onClick={handleGenerateDepth}
                disabled={isGenerating}
                icon={isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              >
                {isGenerating ? 'Analyzing Subject...' : activeWallpaper.depthMapUrl ? 'Regenerate Depth' : 'Detect Subject & 3D'}
              </Button>

              {activeWallpaper.depthMapUrl && (
                <Button
                   variant="secondary"
                   className="w-full text-xs h-8"
                   onClick={toggleDepthMode}
                   icon={<Power size={14}/>}
                >
                  {isDepthEnabled ? 'Disable 3D Mode' : 'Enable 3D Mode'}
                </Button>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-blue-400 font-semibold text-sm tracking-wider uppercase">
              <Settings2 size={16} />
              <span>Adjustments</span>
            </div>
            <div className={`bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-2 transition-opacity ${!isDepthEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <Slider 
                label="3D Depth" 
                value={settings.depthIntensity} 
                min={0} max={45} 
                onChange={(v) => updateSetting('depthIntensity', v)} 
              />
              <Slider 
                label="Light Intensity" 
                value={settings.lightIntensity} 
                min={0} max={1} step={0.05}
                onChange={(v) => updateSetting('lightIntensity', v)} 
              />
              <Slider 
                label="Shadow Opacity" 
                value={settings.shadowOpacity} 
                min={0} max={1} step={0.05}
                onChange={(v) => updateSetting('shadowOpacity', v)} 
              />
               <Slider 
                label="Perspective (Zoom)" 
                value={settings.scale} 
                min={0.8} max={1.5} step={0.01}
                onChange={(v) => updateSetting('scale', v)} 
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-purple-400 font-semibold text-sm tracking-wider uppercase">
              <Sparkles size={16} />
              <span>Create New</span>
            </div>
            <Uploader onImageSelect={handleImageUpload} />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-green-400 font-semibold text-sm tracking-wider uppercase">
              <ImageIcon size={16} />
              <span>Library</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {wallpapers.map(wp => (
                <button
                  key={wp.id}
                  onClick={() => setActiveWallpaper(wp)}
                  className={`
                    group relative aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all duration-200
                    ${activeWallpaper.id === wp.id 
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/20' 
                      : 'border-transparent hover:border-gray-600 opacity-70 hover:opacity-100'}
                  `}
                >
                  <img 
                    src={wp.url} 
                    alt={wp.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {wp.depthMapUrl && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-[10px] px-1.5 py-0.5 rounded shadow-lg text-white font-bold tracking-tighter">AI 3D</div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
                    <p className="text-xs font-medium text-white truncate">{wp.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>

      <main className="flex-1 relative bg-gray-950 flex flex-col h-screen overflow-hidden">
        <div className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-center pointer-events-none">
          <div className={`
             pointer-events-auto bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-sm font-medium text-gray-300 transition-opacity duration-300
             ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}
          `}>
             {activeWallpaper.name}
          </div>
        </div>

        <ThreeDView 
          imageUrl={activeWallpaper.url}
          // Only pass depthUrl if mode is enabled
          depthUrl={isDepthEnabled ? activeWallpaper.depthMapUrl : undefined}
          settings={settings}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />

        {!isFullscreen && (
          <div className="absolute bottom-8 left-0 w-full text-center pointer-events-none">
            <p className="text-white/30 text-xs tracking-widest uppercase animate-pulse-slow">
              {isDepthEnabled && activeWallpaper.depthMapUrl ? 'AI 3D Mode Active • Move cursor' : 'Standard View • Move cursor'}
            </p>
          </div>
        )}
      </main>

      {showInstallModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
            
            <div className="text-center mb-6">
              <div className="bg-blue-600/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="text-blue-500" size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Set as Live Wallpaper</h2>
              <p className="text-gray-400 text-sm">
                To use this as an interactive 3D wallpaper on your phone, you need to add this app to your Home Screen.
              </p>
            </div>

            <div className="space-y-4 bg-gray-800/50 p-4 rounded-xl">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">iOS (iPhone)</h3>
              <div className="flex items-start gap-3 text-sm text-gray-300">
                <Share size={18} className="mt-0.5 shrink-0" />
                <span>Tap the <b>Share</b> button in Safari toolbar.</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-300">
                <span className="w-5 h-5 flex items-center justify-center font-bold border border-gray-500 rounded text-[10px]">+</span>
                <span>Select <b>Add to Home Screen</b>.</span>
              </div>
            </div>

            <div className="space-y-4 bg-gray-800/50 p-4 rounded-xl mt-4">
              <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider">Android</h3>
              <div className="flex items-start gap-3 text-sm text-gray-300">
                <Menu size={18} className="mt-0.5 shrink-0" />
                <span>Tap the <b>Chrome Menu</b> (three dots).</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-300">
                <Smartphone size={18} className="mt-0.5 shrink-0" />
                <span>Select <b>Add to Home Screen</b> or <b>Install App</b>.</span>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1"
                onClick={() => setShowInstallModal(false)}
              >
                Close
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  setShowInstallModal(false);
                  setIsFullscreen(true);
                }}
              >
                Try Preview Mode
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}