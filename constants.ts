import { Wallpaper, WallpaperSettings } from './types';

// We use placeholders here. The user is expected to upload their specific images
// or we provide a few high-quality anime-style placeholders that match the vibe.
export const INITIAL_WALLPAPERS: Wallpaper[] = [
  {
    id: '1',
    name: 'Cyber Samurai',
    url: 'https://images.unsplash.com/photo-1515405295579-ba7f9f92f413?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: '2',
    name: 'Neon City',
    url: 'https://images.unsplash.com/photo-1570284613060-766c33850e00?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: '3',
    name: 'Abstract Flow',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: '4',
    name: 'Mystic Peaks',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1000&auto=format&fit=crop',
  }
];

export const DEFAULT_SETTINGS: WallpaperSettings = {
  depthIntensity: 20,
  lightIntensity: 0.4,
  shadowOpacity: 0.5,
  scale: 1.05,
  perspective: 1000,
};