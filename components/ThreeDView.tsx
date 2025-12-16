import React, { useRef, useState, useEffect, useCallback } from 'react';
import { WallpaperSettings } from '../types';
import { Maximize2, Minimize2, Smartphone } from 'lucide-react';
import { Button } from './Button';
import { DepthCanvas } from './DepthCanvas';

interface ThreeDViewProps {
  imageUrl: string;
  depthUrl?: string; // New prop for depth map
  settings: WallpaperSettings;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const ThreeDView: React.FC<ThreeDViewProps> = ({ 
  imageUrl, 
  depthUrl,
  settings, 
  isFullscreen, 
  onToggleFullscreen 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });
  const [isGyroEnabled, setIsGyroEnabled] = useState(false);

  // Handle Mouse Movement
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isGyroEnabled) return; 
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentages -1 to 1
    const xPct = (x / rect.width - 0.5) * 2;
    const yPct = (y / rect.height - 0.5) * 2;

    setRotation({ x: -yPct, y: xPct });
    setLightPos({ 
      x: 50 + (xPct * 40), 
      y: 50 + (yPct * 40) 
    });
  }, [isGyroEnabled]);

  const handleMouseLeave = () => {
    if (!isGyroEnabled) {
      setRotation({ x: 0, y: 0 });
      setLightPos({ x: 50, y: 50 });
    }
  };

  // Handle Device Orientation
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (!event.beta || !event.gamma) return;
    
    const maxTilt = 45;
    const beta = Math.min(Math.max(event.beta - 45, -maxTilt), maxTilt);
    const gamma = Math.min(Math.max(event.gamma, -maxTilt), maxTilt);

    const xPct = gamma / maxTilt;
    const yPct = beta / maxTilt;

    setRotation({ x: -yPct, y: xPct });
    setLightPos({ 
      x: 50 + (xPct * 40), 
      y: 50 + (yPct * 40) 
    });
  }, []);

  const enableGyro = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setIsGyroEnabled(true);
        }
      } catch (error) {
        console.error('Gyro permission denied', error);
      }
    } else {
      setIsGyroEnabled(true);
    }
  };

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      enableGyro();
    }
  }, []);

  useEffect(() => {
    if (isGyroEnabled) {
      window.addEventListener('deviceorientation', handleOrientation);
    } else {
      window.removeEventListener('deviceorientation', handleOrientation);
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isGyroEnabled, handleOrientation]);

  // Derived CSS transforms for Standard Mode
  const rotateX = rotation.x * settings.depthIntensity;
  const rotateY = rotation.y * settings.depthIntensity;
  
  const transformStyle = {
    transform: `
      perspective(${settings.perspective}px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale3d(${settings.scale}, ${settings.scale}, ${settings.scale})
    `,
  };

  const lightingStyle = {
    backgroundImage: `radial-gradient(
      circle at ${lightPos.x}% ${lightPos.y}%, 
      rgba(255, 255, 255, ${settings.lightIntensity}) 0%, 
      rgba(0, 0, 0, 0) 60%
    )`,
  };

  const shadowStyle = {
    boxShadow: `
      ${-rotateY * 2}px ${rotateX * 2}px 30px rgba(0,0,0, ${settings.shadowOpacity})
    `
  };

  return (
    <div className={`relative flex items-center justify-center transition-all duration-500 ease-in-out ${isFullscreen ? 'w-full h-full fixed inset-0 z-50 bg-black' : 'w-full h-full min-h-[500px]'}`}>
      
      <div 
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair perspective-container"
        style={{ touchAction: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        
        <div 
          className="relative transition-transform duration-100 ease-out will-change-transform"
          style={{
            ...transformStyle,
            width: isFullscreen ? '100vw' : '300px', 
            height: isFullscreen ? '100vh' : '450px',
            maxWidth: isFullscreen ? '100%' : '90vw',
            maxHeight: isFullscreen ? '100%' : '80vh',
            objectFit: 'cover',
          }}
        >
          {depthUrl ? (
            // --- NEW: WebGL Depth View ---
            // When a depth map is present, we use the canvas instead of the CSS card.
            // We still keep the container's transforms for global perspective tilting if desired,
            // but the internal displacement happens in WebGL.
            <div className={`w-full h-full rounded-2xl overflow-hidden ${!isFullscreen ? 'shadow-2xl' : ''}`}>
               <DepthCanvas 
                  image={imageUrl}
                  depthMap={depthUrl}
                  rotation={rotation}
                  settings={settings}
               />
            </div>
          ) : (
            // --- OLD: CSS 3D View ---
            <>
              <div 
                className="absolute inset-0 w-full h-full bg-center bg-no-repeat rounded-2xl"
                style={{ 
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: 'cover',
                  borderRadius: isFullscreen ? '0' : '1rem',
                  ...shadowStyle
                }}
              />
              <div 
                className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay z-10"
                style={{
                  ...lightingStyle,
                  borderRadius: isFullscreen ? '0' : '1rem',
                }}
              />
              {!isFullscreen && (
                <div className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none z-20" />
              )}
            </>
          )}

        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex gap-2 z-50">
        {!isGyroEnabled && (
          <Button 
            variant="secondary" 
            onClick={enableGyro}
            className="rounded-full w-12 h-12 !p-0 flex items-center justify-center bg-gray-800/80 backdrop-blur"
          >
            <Smartphone size={20} />
          </Button>
        )}
        <Button 
          variant="secondary" 
          onClick={onToggleFullscreen}
          className="rounded-full w-12 h-12 !p-0 flex items-center justify-center bg-gray-800/80 backdrop-blur"
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </Button>
      </div>
    </div>
  );
};