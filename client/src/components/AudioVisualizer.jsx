import { useEffect, useRef } from 'react';

const AudioVisualizer = ({ isSpeaking }) => {
    return (
        <div className="relative flex items-center justify-center w-64 h-64">
            {/* Core Orb */}
            <div className={`relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 shadow-[0_0_60px_-10px_rgba(168,85,247,0.6)] transition-all duration-300 ${isSpeaking ? 'scale-110' : 'scale-100 grayscale-[0.2]'}`}>
                {/* Inner shine */}
                <div className="absolute inset-0 rounded-full bg-white/20 blur-md"></div>
            </div>

            {/* Ripple Rings (Animation) */}
            {isSpeaking && (
                <>
                    <div className="absolute inset-0 border border-purple-500/30 rounded-full animate-ping opacity-20"></div>
                    <div className="absolute inset-[-20px] border border-blue-500/30 rounded-full animate-ping opacity-10" style={{ animationDelay: '0.3s' }}></div>
                    <div className="absolute inset-[-40px] border border-pink-500/30 rounded-full animate-ping opacity-10" style={{ animationDelay: '0.6s' }}></div>
                </>
            )}

            {/* Ambient Glow Container */}
            <div className={`absolute inset-0 bg-purple-500/20 rounded-full blur-3xl transition-opacity duration-500 ${isSpeaking ? 'opacity-100' : 'opacity-40'}`}></div>

            <p className={`absolute -bottom-16 text-sm font-semibold tracking-[0.2em] uppercase transition-colors duration-300 ${isSpeaking ? 'text-purple-300 animate-pulse' : 'text-gray-600'}`}>
                {isSpeaking ? 'Mindly Listening...' : 'Waiting...'}
            </p>
        </div>
    );
};

export default AudioVisualizer;
