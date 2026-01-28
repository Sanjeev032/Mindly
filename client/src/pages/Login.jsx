import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Logo from '../components/Logo';
import { FaPlay, FaUserTie, FaCode, FaArrowRight, FaLock, FaCheckCircle, FaGraduationCap, FaBriefcase, FaChalkboardTeacher } from 'react-icons/fa';

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
        <div className="min-h-screen relative overflow-x-hidden flex flex-col bg-black text-gray-200 selection:bg-purple-500 selection:text-white">

            {/* HERO SECTION - UNCHANGED */}
            <div className="relative min-h-screen flex flex-col">
                {/* Ambient Background Orbs */}
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

                {/* Navbar */}
                <nav className="relative z-50 p-6 flex justify-between items-center">
                    <Logo />
                    <button onClick={() => document.getElementById('login-modal').scrollIntoView({ behavior: 'smooth' })} className="btn-neon py-2 px-6 text-sm">
                        Sign In
                    </button>
                </nav>

                <main className="flex-1 container mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-16 relative z-10 py-10">

                    {/* Center / Left Content: Hero + Tiles */}
                    <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-12">

                        <div className="space-y-6 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-purple-300 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_-5px_rgba(168,85,247,0.5)]">
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-glow"></span>
                                AI-Powered Interview Coach
                            </div>
                            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-2xl">
                                Mindly
                            </h1>
                            <p className="text-xl text-gray-400 max-w-lg mx-auto lg:mx-0 font-light leading-relaxed">
                                Your personal AI assistant for mock interviews. <br className="hidden md:block" />
                                Master <span className="text-white font-medium border-b border-purple-500/50">Technical</span>, <span className="text-white font-medium border-b border-blue-500/50">HR</span>, and <span className="text-white font-medium border-b border-pink-500/50">Behavioral</span> rounds.
                            </p>
                        </div>

                        {/* Interactive Tiles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                            <Link to="/signup" className="group glass-card p-6 flex items-center justify-between hover:-translate-y-1 transition-transform cursor-pointer border-l-4 border-l-purple-500">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                        <FaPlay className="ml-1" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-lg text-white">Start Mock Interview</h3>
                                        <p className="text-xs text-gray-400">Launch a new AI session</p>
                                    </div>
                                </div>
                                <FaArrowRight className="text-purple-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                            </Link>

                            <div className="group glass-card p-6 flex items-center justify-between hover:-translate-y-1 transition-transform cursor-default border-l-4 border-l-blue-500 opacity-80 hover:opacity-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <FaUserTie />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-lg text-white">Practice HR Questions</h3>
                                        <p className="text-xs text-gray-400">Behavioral & Culture Fit</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group glass-card p-6 flex items-center justify-between hover:-translate-y-1 transition-transform cursor-default border-l-4 border-l-pink-500 opacity-80 hover:opacity-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                        <FaCode />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-lg text-white">Technical Drill</h3>
                                        <p className="text-xs text-gray-400">Coding & Algorithms</p>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-6 flex items-center justify-center text-center text-gray-500 text-sm font-medium">
                                More coming soon...
                            </div>
                        </div>
                    </div>

                    {/* Right: Login Modal (Glass) */}
                    <div id="login-modal" className="w-full max-w-md">
                        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] transition-shadow duration-500">
                            {/* Glow effect inside card */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                            <div className="mb-8 text-center">
                                <div className="w-12 h-12 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                                    <FaLock className="text-gray-300" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                                <p className="text-gray-400 text-sm">Sign in to continue your progress</p>
                            </div>

                            {error && (
                                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                                <div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-glass"
                                        placeholder="Email Address"
                                        required
                                    />
                                </div>
                                <div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-glass"
                                        placeholder="Password"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full btn-primary-glow mt-2"
                                >
                                    Sign In
                                </button>
                            </form>

                            <div className="mt-8 text-center">
                                <p className="text-gray-500 text-sm">
                                    New here? <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-semibold hover:underline decoration-purple-400/30 underline-offset-4 transition-all">Create Account</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </main>

                <div className="absolute bottom-10 left-0 right-0 text-center animate-bounce duration-[2000ms]">
                    <button onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })} className="text-gray-500 hover:text-white transition-colors text-sm uppercase tracking-widest font-semibold flex flex-col items-center gap-2 mx-auto">
                        Learn More
                        <span className="block border-l border-b border-gray-500 w-3 h-3 transform -rotate-45"></span>
                    </button>
                </div>
            </div>

            {/* SECTIONS LAYERS (NEW CONTENT) */}
            <div className="relative z-20 bg-black">

                {/* 1. About Mindly */}
                <section id="about" className="py-24 px-6 border-t border-white/5">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight">What is Mindly?</h2>
                        <p className="text-xl md:text-2xl text-gray-400 leading-relaxed font-light">
                            Mindly is an <span className="text-purple-400 font-medium">AI-powered mock interview platform</span> designed to help candidates prepare for real-world interviews. It simulates technical, HR, and behavioral interview rounds and provides intelligent, conversational practice to improve confidence and clarity.
                        </p>
                    </div>
                </section>

                {/* 2. How It Works */}
                <section className="py-24 px-6 bg-white/[0.02]">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How Mindly Works</h2>
                            <p className="text-gray-500">Your path to interview success in three simple steps.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { title: "Choose Interview Type", desc: "Select technical, HR, or behavioral interviews modeled after industry standards.", icon: <FaCheckCircle /> },
                                { title: "Practice with AI", desc: "Answer realistic, dynamically generated questions in a real-time conversational environment.", icon: <FaPlay /> },
                                { title: "Improve Continuously", desc: "Receive feedback, refine your answers, and build confidence with every session.", icon: <FaArrowRight /> }
                            ].map((step, idx) => (
                                <div key={idx} className="glass-panel p-8 rounded-2xl relative group hover:bg-white/5 transition-colors">
                                    <div className="absolute -top-4 -left-4 w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center font-bold text-xl text-gray-400 border border-gray-700">
                                        {idx + 1}
                                    </div>
                                    <div className="w-16 h-16 bg-blue-900/20 text-blue-400 rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto group-hover:scale-110 transition-transform">
                                        {step.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3 text-center">{step.title}</h3>
                                    <p className="text-gray-400 text-center leading-relaxed text-sm">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. Key Features */}
                <section className="py-24 px-6 border-y border-white/5">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Key Features</h2>
                            <p className="text-gray-500">Everything you need to master the interview process.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                "AI-Powered Mock Interviews", "Role & Skill-Based Questions", "Adaptive HR & Behavioural Rounds",
                                "Real-time Conversational AI", "Speech-to-Text Analysis", "Confidence Building Metrics"
                            ].map((feature, i) => (
                                <div key={i} className="glass-card p-6 flex items-center gap-4 border-l-2 border-l-purple-500/50">
                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    <span className="font-semibold text-gray-200">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 4. Audience Section */}
                <section className="py-24 px-6 bg-gradient-to-b from-black to-gray-900">
                    <div className="container mx-auto max-w-5xl text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">Who Is Mindly For?</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors">
                                <FaGraduationCap className="text-4xl text-blue-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Students & Freshers</h3>
                                <p className="text-gray-400 text-sm">Preparing for campus placements and first jobs.</p>
                            </div>
                            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors">
                                <FaBriefcase className="text-4xl text-purple-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Job Switchers</h3>
                                <p className="text-gray-400 text-sm">Targeting senior roles and technical deep dives.</p>
                            </div>
                            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-colors">
                                <FaChalkboardTeacher className="text-4xl text-pink-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Professionals</h3>
                                <p className="text-gray-400 text-sm">Improving communication and leadership presence.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. Final CTA */}
                <section className="py-32 px-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-purple-900/40"></div>
                    <div className="container mx-auto max-w-4xl text-center relative z-10">
                        <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 tracking-tight">Ready to crack your next interview?</h2>
                        <Link to="/signup" className="inline-flex items-center gap-3 bg-white text-black font-bold text-lg py-4 px-10 rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                            Start Mock Interview <FaArrowRight />
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 border-t border-white/10 bg-black text-center text-gray-500 text-sm">
                    <p>© 2024 Mindly. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
};

export default Login;
