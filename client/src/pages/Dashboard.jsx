import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import ResumeUploader from '../components/ResumeUploader';
import Logo from '../components/Logo';
import { FaHistory, FaCode, FaUserTie, FaNetworkWired, FaSignOutAlt, FaPlus, FaRocket } from 'react-icons/fa';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/interviews`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setInterviews(res.data.data);
        } catch (err) {
            console.error('Failed to fetch interviews', err);
        } finally {
            setLoading(false);
        }
    };

    const startInterview = async (type) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/interviews`, { type }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const sessionId = res.data.data.session_id || res.data.data._id;
            navigate(`/interview/${sessionId}`);
        } catch (err) {
            console.error('Failed to start interview', err);
            alert('Failed to start session. Check console.');
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-black text-white">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Navbar */}
            <nav className="relative z-20 border-b border-white/5 bg-black/50 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex justify-between items-center">
                    <Logo />
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-semibold text-white">{user?.name}</span>
                            <span className="text-xs text-purple-400">{user?.profile?.target_role || 'Candidate'}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10 hidden md:block"></div>
                        <button onClick={logout} className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                            <FaSignOutAlt />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-6 py-10 relative z-10">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Dashboard</span>
                    </h1>
                    <p className="text-gray-400">Select a module to begin your practice.</p>
                </div>

                {/* Primary Action Tiles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <button
                        onClick={() => startInterview('HR')}
                        className="group relative h-64 glass-card p-8 flex flex-col justify-between overflow-hidden text-left"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10 w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 text-2xl group-hover:scale-110 transition-transform duration-300">
                            <FaUserTie />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">HR Round</h3>
                            <p className="text-sm text-gray-400">Behavioral questions & culture fit assessment.</p>
                        </div>
                        <div className="absolute bottom-4 right-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <FaPlus />
                        </div>
                    </button>

                    <button
                        onClick={() => startInterview('Technical')}
                        className="group relative h-64 glass-card p-8 flex flex-col justify-between overflow-hidden text-left"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10 w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 text-2xl group-hover:scale-110 transition-transform duration-300">
                            <FaCode />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-200 transition-colors">Technical</h3>
                            <p className="text-sm text-gray-400">Data structures, algorithms & coding challenges.</p>
                        </div>
                        <div className="absolute bottom-4 right-4 text-purple-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <FaPlus />
                        </div>
                    </button>

                    <button
                        onClick={() => startInterview('System Design')}
                        className="group relative h-64 glass-card p-8 flex flex-col justify-between overflow-hidden text-left"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10 w-14 h-14 rounded-2xl bg-pink-500/20 flex items-center justify-center text-pink-400 text-2xl group-hover:scale-110 transition-transform duration-300">
                            <FaNetworkWired />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-200 transition-colors">System Design</h3>
                            <p className="text-sm text-gray-400">Scalability, architecture & distributed systems.</p>
                        </div>
                        <div className="absolute bottom-4 right-4 text-pink-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <FaPlus />
                        </div>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Activity Feed */}
                    <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <FaHistory className="text-gray-400" /> Recent History
                            </h2>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-gray-500 animate-pulse">Syncing...</div>
                        ) : interviews.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No sessions yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {interviews.map(session => (
                                    <div key={session._id} onClick={() => navigate(`/interview/${session._id}`)} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.type === 'HR' ? 'bg-blue-500/20 text-blue-400' :
                                                    session.type === 'Technical' ? 'bg-purple-500/20 text-purple-400' : 'bg-pink-500/20 text-pink-400'
                                                }`}>
                                                <FaRocket className="text-sm" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-200 group-hover:text-white">{session.type} Round</h4>
                                                <p className="text-xs text-gray-500">{new Date(session.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-3 py-1 rounded-full border ${session.status === 'COMPLETED' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {session.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Resume Sidebar */}
                    <div className="glass-panel rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Resume Context</h2>
                        <ResumeUploader onUploadSuccess={() => alert("Resume Analyzed!")} />

                        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/10">
                            <p className="text-xs text-purple-200 font-medium">Pro Tip</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Uploading your resume allows Mindly to ask specific questions about your past projects.
                            </p>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default Dashboard;
