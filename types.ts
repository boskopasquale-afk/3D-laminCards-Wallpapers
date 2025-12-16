export interface Wallpaper {
  id: string;
  url: string;
  name: string;
  thumbnail?: string;
  depthMapUrl?: string; // New field for generated depth maps
}

export interface WallpaperSettings {
  depthIntensity: number; // 1 to 50
  lightIntensity: number; // 0 to 1
  shadowOpacity: number; // 0 to 1
  scale: number; // 0.8 to 1.5
  perspective: number; // 500 to 2000
}

export interface Position {
  x: number;
  y: number;
}