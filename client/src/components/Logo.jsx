import { FaBrain } from 'react-icons/fa';

const Logo = ({ className = "" }) => {
    return (
        <div className={`flex items-center gap-2 font-sans ${className}`}>
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500 blur-md opacity-50 rounded-full animate-pulse"></div>
                <FaBrain className="text-3xl text-blue-400 relative z-10" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
                Mind<span className="text-blue-400">ly</span>
            </span>
        </div>
    );
};

export default Logo;
