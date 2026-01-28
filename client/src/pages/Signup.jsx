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
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Logo className="justify-center mb-6 scale-125" />
                    <h2 className="text-3xl font-bold text-white tracking-tight">Create your account</h2>
                    <p className="text-slate-400 mt-2">Start your journey to interview mastery.</p>
                </div>

                <div className="glass-card p-8 rounded-2xl">
                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center flex items-center justify-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider ml-1">Full Name</label>
                            <input name="name" onChange={handleChange} className="input-field" placeholder="John Doe" required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider ml-1">Email</label>
                            <input name="email" type="email" onChange={handleChange} className="input-field" placeholder="name@company.com" required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider ml-1">Password</label>
                            <input name="password" type="password" onChange={handleChange} className="input-field" placeholder="••••••••" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider ml-1">Target Role</label>
                                <div className="relative">
                                    <select name="targetRole" onChange={handleChange} className="input-field appearance-none cursor-pointer">
                                        <option value="Software Engineer">Software Engineer</option>
                                        <option value="Product Manager">Product Manager</option>
                                        <option value="Data Scientist">Data Scientist</option>
                                        <option value="Designer">Designer</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500 text-xs">▼</div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider ml-1">Experience</label>
                                <div className="relative">
                                    <select name="experienceLevel" onChange={handleChange} className="input-field appearance-none cursor-pointer">
                                        <option value="Junior">Junior (0-2y)</option>
                                        <option value="Mid">Mid (2-5y)</option>
                                        <option value="Senior">Senior (5y+)</option>
                                        <option value="Lead">Lead/Staff</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500 text-xs">▼</div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full btn-primary py-3.5 mt-2 text-base shadow-blue-500/20">
                            Create Account
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-slate-500">
                    Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline decoration-blue-400/30 underline-offset-4 transition-all">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
