import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import ResumeUploader from '../components/ResumeUploader';
import StatCard from '../components/StatCard';
import { FaChartLine, FaHistory, FaCode, FaUserTie, FaNetworkWired } from 'react-icons/fa';

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
            const res = await axios.get('http://localhost:5000/api/interviews', {
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
            // Using the Refactored backend API
            const res = await axios.post('http://localhost:5000/api/interviews', { type }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // New API returns { data: { session_id, message } }
            const sessionId = res.data.data.session_id || res.data.data._id; // Fallback for safety
            navigate(`/interview/${sessionId}`);
        } catch (err) {
            console.error('Failed to start interview', err);
            alert('Failed to start session. Check console.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            {/* Top Navigation */}
            <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">AI</div>
                        <span className="font-bold text-xl tracking-tight">Coach</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm hidden md:block">Welcome, {user?.name}</span>
                        <div className="w-px h-6 bg-gray-700 hidden md:block"></div>
                        <button onClick={logout} className="text-sm font-medium text-red-400 hover:text-red-300 transition">
                            Sign Out
                        </button>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-6 py-8">
                {/* Header Section */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Interview Dashboard</h1>
                    <p className="text-gray-400">Track your progress and practice with AI-driven scenarios.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Actions & Stats */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Stats Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <StatCard
                                title="Total Sessions"
                                value={interviews.length}
                                icon={<FaHistory className="text-blue-400 text-xl" />}
                                color="bg-blue-500"
                            />
                            <StatCard
                                title="Avg Score"
                                value={interviews.length > 0 ? "7.5" : "-"} // Placeholder until scoring engine is fully hooked up
                                icon={<FaChartLine className="text-green-400 text-xl" />}
                                color="bg-green-500"
                            />
                        </div>

                        {/* Start Interview Cards */}
                        <div>
                            <h2 className="text-xl font-semibold mb-4 text-gray-200">Start Practice</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={() => startInterview('HR')}
                                    className="p-6 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 transition shadow-lg text-left group relative overflow-hidden"
                                >
                                    <FaUserTie className="text-3xl mb-4 text-blue-200" />
                                    <h3 className="font-bold text-lg">HR Round</h3>
                                    <p className="text-blue-200 text-sm mt-1 opacity-80">Behavioral & Culture fit questions.</p>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-10 -mt-10 transition group-hover:scale-150"></div>
                                </button>

                                <button
                                    onClick={() => startInterview('Technical')}
                                    className="p-6 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 transition shadow-lg text-left group relative overflow-hidden"
                                >
                                    <FaCode className="text-3xl mb-4 text-emerald-200" />
                                    <h3 className="font-bold text-lg">Technical</h3>
                                    <p className="text-emerald-200 text-sm mt-1 opacity-80">Coding & Algorithm deep dives.</p>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-10 -mt-10 transition group-hover:scale-150"></div>
                                </button>

                                <button
                                    onClick={() => startInterview('System Design')}
                                    className="p-6 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 transition shadow-lg text-left group relative overflow-hidden"
                                >
                                    <FaNetworkWired className="text-3xl mb-4 text-purple-200" />
                                    <h3 className="font-bold text-lg">System Design</h3>
                                    <p className="text-purple-200 text-sm mt-1 opacity-80">Architecture & Scalability.</p>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-10 -mt-10 transition group-hover:scale-150"></div>
                                </button>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 text-gray-200">Recent History</h2>
                            {loading ? (
                                <div className="text-gray-500 animate-pulse">Loading sessions...</div>
                            ) : interviews.length === 0 ? (
                                <div className="text-gray-500 py-4 text-center">No interviews yet. Start one above!</div>
                            ) : (
                                <div className="space-y-3">
                                    {interviews.map(session => (
                                        <div key={session._id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition cursor-pointer" onClick={() => navigate(`/interview/${session._id}`)}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${session.type === 'HR' ? 'bg-blue-900 text-blue-300' :
                                                        session.type === 'Technical' ? 'bg-emerald-900 text-emerald-300' :
                                                            'bg-purple-900 text-purple-300'
                                                    }`}>
                                                    {session.type?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-white">{session.type} Interview</h4>
                                                    <p className="text-xs text-gray-400">{new Date(session.started_at || session.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${session.status === 'COMPLETED' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                                    {session.status || 'ACTIVE'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Profile & Resume */}
                    <div className="space-y-8">
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 text-gray-200">Resume Intelligence</h2>
                            <p className="text-sm text-gray-400 mb-4">Upload your resume to let the AI customize questions to your experience level.</p>
                            <ResumeUploader onUploadSuccess={() => alert("Profile Updated!")} />
                        </div>

                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 opacity-60 pointer-events-none grayscale">
                            <h2 className="text-xl font-semibold mb-2 text-gray-200">Daily Challenge</h2>
                            <p className="text-sm text-gray-400">Coming Soon...</p>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Dashboard;
