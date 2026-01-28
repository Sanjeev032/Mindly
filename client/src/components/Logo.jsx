import { FaBrain } from 'react-icons/fa';

const Logo = ({ className = "" }) => {
    return (
        <div className={`flex items-center gap-3 font-sans select-none ${className}`}>
            <div className="relative flex items-center justify-center w-10 h-10">
                <div className="absolute inset-0 bg-purple-500 blur-lg opacity-50 rounded-full animate-pulse-slow"></div>
                <FaBrain className="text-2xl text-white relative z-10 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                Mindly
            </span>
        </div>
    );
};

export default Logo;
