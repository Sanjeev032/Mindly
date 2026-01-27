import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Logo from '../components/Logo';
import { FaCheckCircle, FaRobot, FaFileAlt, FaVideo, FaArrowRight } from 'react-icons/fa';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, error } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(email, password);
        if (success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-blue-500 selection:text-white">
            {/* Navbar */}
            <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <Logo />
                    <div className="flex gap-4">
                        <Link to="/signup" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition">Sign Up</Link>
                        <button onClick={() => document.getElementById('login-form').scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition">Login</button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-black pointer-events-none"></div>
                <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">

                    {/* Left Content */}
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-800 text-blue-300 text-xs font-semibold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                            AI-Powered Career Coach
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                            Master Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Interview Skills</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
                            Practice with our advanced AI, get instant feedback on your answers, and optimize your resume to land your dream job.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link to="/signup" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 group">
                                Get Started Free
                                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-lg transition border border-gray-700">
                                How it Works
                            </button>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500 pt-8">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-gray-700 border-2 border-black flex items-center justify-center text-xs">
                                        User
                                    </div>
                                ))}
                            </div>
                            <p>Trusted by 1,000+ candidates</p>
                        </div>
                    </div>

                    {/* Right Login Form */}
                    <div id="login-form" className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-8 rounded-2xl shadow-2xl skew-y-0 transform transition hover:scale-[1.01] duration-500">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                            <p className="text-gray-400 text-sm">Login to continue your prep</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-gray-400 text-sm font-medium mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-700 p-3 rounded-lg focus:outline-none focus:border-blue-500 text-white transition placeholder-gray-600"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-medium mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-700 p-3 rounded-lg focus:outline-none focus:border-blue-500 text-white transition placeholder-gray-600"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-blue-900/20"
                            >
                                Login to Dashboard
                            </button>
                        </form>

                        <div className="mt-6 text-center text-sm text-gray-500">
                            Don't have an account? <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium">Create one for free</Link>
                        </div>
                    </div>

                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-gray-900/50 border-t border-gray-800">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to ace the interview</h2>
                        <p className="text-gray-400">Our AI-driven platform provides comprehensive tools to prepare you for technical, behavioral, and system design rounds.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-8 bg-black/40 border border-gray-800 rounded-2xl hover:border-blue-500/30 transition group">
                            <div className="w-14 h-14 bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-400 text-2xl mb-6 group-hover:scale-110 transition-transform">
                                <FaRobot />
                            </div>
                            <h3 className="text-xl font-bold mb-3">AI Mock Interviews</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Practice with an AI interviewer that adapts to your responses, probes deeper, and simulates real pressure.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-8 bg-black/40 border border-gray-800 rounded-2xl hover:border-purple-500/30 transition group">
                            <div className="w-14 h-14 bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-400 text-2xl mb-6 group-hover:scale-110 transition-transform">
                                <FaFileAlt />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Resume Analysis</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Upload your PDF resume and verify if it matches the job description. Get scoring and improvement tips.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-8 bg-black/40 border border-gray-800 rounded-2xl hover:border-emerald-500/30 transition group">
                            <div className="w-14 h-14 bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-400 text-2xl mb-6 group-hover:scale-110 transition-transform">
                                <FaVideo />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Real-time Visuals</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Experience a responsive audio-visual interface that makes talking to AI feel natural and engaging.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials / Trust */}
            <section className="py-20 border-t border-gray-800 bg-black">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-2xl font-bold mb-12 text-gray-300">Supported Technologies & Topics</h2>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        {['React', 'Node.js', 'System Design', 'Python', 'Java', 'AWS', 'Data Structures'].map((tech) => (
                            <span key={tech} className="text-xl font-bold text-gray-500 hover:text-white cursor-default transition">{tech}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-800 bg-gray-900 text-sm text-gray-400">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <Logo className="scale-75 origin-left" />
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-white transition">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition">Terms of Service</a>
                        <a href="#" className="hover:text-white transition">Contact</a>
                    </div>
                    <p>© 2024 Mindly. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Login;
