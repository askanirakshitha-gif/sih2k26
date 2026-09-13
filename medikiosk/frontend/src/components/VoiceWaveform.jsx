import React from 'react';

export default function VoiceWaveform({ isListening }) {
  if (!isListening) return null;

  return (
    <div className="flex items-center justify-center space-x-1.5 h-12 my-2">
      <div className="w-1.5 bg-red-500 rounded-full wave-bar"></div>
      <div className="w-1.5 bg-red-500 rounded-full wave-bar"></div>
      <div className="w-1.5 bg-red-600 rounded-full wave-bar"></div>
      <div className="w-1.5 bg-red-500 rounded-full wave-bar"></div>
      <div className="w-1.5 bg-red-500 rounded-full wave-bar"></div>
      <div className="w-1.5 bg-red-600 rounded-full wave-bar"></div>
    </div>
  );
}
