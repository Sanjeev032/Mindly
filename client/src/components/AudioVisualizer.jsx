import React from 'react';

const AudioVisualizer = ({ isSpeaking }) => {
    return (
        <div className="relative flex items-center justify-center w-64 h-64">
            {/* Outer Rings (Pulse when speaking) */}
            <div className={`absolute inset-0 border-4 border-blue-500/30 rounded-full transition-all duration-500 ${isSpeaking ? 'animate-ping scale-110' : 'scale-100'}`}></div>
            <div className={`absolute inset-4 border-4 border-blue-400/40 rounded-full transition-all duration-500 delay-100 ${isSpeaking ? 'animate-pulse scale-105' : 'scale-100'}`}></div>

            {/* Core Avatar */}
            <div className="w-48 h-48 bg-gray-900 rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-500 relative overflow-hidden">
                <div className={`absolute w-full h-full bg-blue-600/10 blur-xl ${isSpeaking ? 'animate-pulse' : ''}`}></div>
                <div className="z-10 text-center">
                    <div className="text-5xl mb-2">🤖</div>
                    <div className="text-blue-300 font-bold tracking-widest text-sm">AI COACH</div>
                </div>
            </div>

            {/* Speaking Status Text */}
            {isSpeaking && (
                <div className="absolute -bottom-12 text-blue-400 text-sm font-mono animate-pulse">
                    Listen...
                </div>
            )}
        </div>
    );
};

export default AudioVisualizer;
