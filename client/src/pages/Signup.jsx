import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Logo from '../components/Logo';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        targetRole: 'Software Engineer', // Default
        experienceLevel: 'Junior'
    });
    const { register, error } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await register(formData);
        if (success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-black text-gray-200 selection:bg-purple-500 selection:text-white">

            {/* Ambient Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

            <div className="relative w-full max-w-lg p-6 z-10">
                <div className="glass-panel p-8 md:p-10 rounded-3xl relative overflow-hidden shadow-[0_0_40px_-10px_rgba(168,85,247,0.15)]">

                    {/* Glow effect inside card */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-6">
                            <Logo className="scale-110" />
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Create your account</h2>
                        <p className="text-gray-400 mt-2 text-sm">Join Mindly and master your interview skills.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest ml-1">Full Name</label>
                            <input
                                name="name"
                                onChange={handleChange}
                                className="input-glass w-full"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest ml-1">Email</label>
                            <input
                                name="email"
                                type="email"
                                onChange={handleChange}
                                className="input-glass w-full"
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest ml-1">Password</label>
                            <input
                                name="password"
                                type="password"
                                onChange={handleChange}
                                className="input-glass w-full"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest ml-1">Target Role</label>
                                <div className="relative">
                                    <select name="targetRole" onChange={handleChange} className="input-glass w-full appearance-none cursor-pointer">
                                        <option value="Software Engineer">Software Engineer</option>
                                        <option value="Product Manager">Product Manager</option>
                                        <option value="Data Scientist">Data Scientist</option>
                                        <option value="Designer">Designer</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500 text-xs">▼</div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest ml-1">Experience</label>
                                <div className="relative">
                                    <select name="experienceLevel" onChange={handleChange} className="input-glass w-full appearance-none cursor-pointer">
                                        <option value="Junior">Junior (0-2y)</option>
                                        <option value="Mid">Mid (2-5y)</option>
                                        <option value="Senior">Senior (5y+)</option>
                                        <option value="Lead">Lead/Staff</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500 text-xs">▼</div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full btn-primary-glow py-4 mt-4 text-base font-bold shadow-lg shadow-purple-900/20">
                            Create Account
                        </button>
                    </form>

                    <p className="mt-8 text-center text-gray-500 text-sm">
                        Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold hover:underline decoration-blue-400/30 underline-offset-4 transition-all">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
