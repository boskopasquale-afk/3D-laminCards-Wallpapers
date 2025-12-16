import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange }) => {
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between mb-1">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
        <span className="text-xs text-blue-400 font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
      />
    </div>
  );
};