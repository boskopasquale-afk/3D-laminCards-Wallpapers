import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface UploaderProps {
  onImageSelect: (url: string, name: string) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onImageSelect }) => {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      const name = file.name.split('.')[0];
      onImageSelect(imageUrl, name);
    }
  }, [onImageSelect]);

  return (
    <div className="w-full">
       <input
        type="file"
        id="image-upload"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <label 
        htmlFor="image-upload"
        className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl cursor-pointer bg-gray-800/50 hover:bg-gray-800 transition-colors group"
      >
        <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-blue-400">
          <Upload size={32} />
          <span className="font-medium text-sm">Upload your own photo</span>
        </div>
      </label>
    </div>
  );
};