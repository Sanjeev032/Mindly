import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaStream from '../hooks/useMediaStream';
import AudioVisualizer from '../components/AudioVisualizer';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaArrowLeft, FaStop, FaPlay } from 'react-icons/fa';

const Interview = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Media & Voice State
    const { stream, isCamOn, isMicOn, toggleCamera, toggleMic, stopMedia } = useMediaStream();
    const [messages, setMessages] = useState([]);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [fullTranscript, setFullTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const videoRef = useRef(null);
    const recognitionRef = useRef(null);
    const fullTranscriptRef = useRef('');

    // 1. Initialize Video Stream
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // 2. Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const chunk = event.results[i][0].transcript;
                        fullTranscriptRef.current += chunk + ' ';
                        setFullTranscript(fullTranscriptRef.current);
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                setCurrentTranscript(interim);
            };

            recognitionRef.current.onerror = (data) => {
                console.error("Speech Error:", data);
            };
        }
    }, []);

    // 3. Fetch Initial Data
    useEffect(() => {
        fetchInterview();
    }, [id]);

    const fetchInterview = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/interviews/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const msgs = res.data.data.messages || [];
            setMessages(msgs);

            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
                speak(lastMsg.content);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (!isListening) {
            // Start Listening
            try {
                fullTranscriptRef.current = '';
                setFullTranscript('');
                setCurrentTranscript('');
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Mic start failed", e);
            }
        } else {
            // Stop & Send
            recognitionRef.current.stop();
            setIsListening(false);

            const finalMessage = (fullTranscriptRef.current + currentTranscript).trim();
            if (finalMessage) {
                handleSend(finalMessage);
            }
        }
    };

    const speak = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsAiSpeaking(true);
        utterance.onend = () => setIsAiSpeaking(false);

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('en-US')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    };

    const handleSend = async (text) => {
        if (!text.trim()) return;

        const newUserMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, newUserMsg]);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/interviews/${id}/message`, { message: text }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const { ai_message, feedback: newFeedback } = res.data.data;

            const newAiMsg = { role: 'assistant', content: ai_message };
            setMessages(prev => [...prev, newAiMsg]);

            if (newFeedback) setFeedback(newFeedback);
            speak(ai_message);

        } catch (err) {
            console.error(err);
        }
    };

    const handleEndSession = () => {
        stopMedia();
        if (recognitionRef.current) recognitionRef.current.abort();
        window.speechSynthesis.cancel();
        navigate('/dashboard');
    };

    return (
        <div className="h-screen bg-black text-white flex flex-col overflow-hidden relative">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black pointer-events-none"></div>

            {/* Floating Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
                <button onClick={handleEndSession} className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                    <FaArrowLeft /> Exit
                </button>
                <div className="glass-panel px-4 py-1 rounded-full text-xs font-bold text-red-400 flex items-center gap-2 border-red-500/20">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> REC
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row relative z-10">

                {/* Center Stage: AI Orb */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative">

                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="relative z-20 mb-12">
                        <AudioVisualizer isSpeaking={isAiSpeaking} />
                    </div>

                    {/* AI Message / Captions */}
                    <div className="max-w-3xl text-center min-h-[100px] relative z-20">
                        {messages.filter(m => m.role === 'assistant').slice(-1).map((msg, i) => (
                            <p key={i} className="text-2xl md:text-3xl font-light leading-relaxed text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-purple-100 to-pink-200 animate-float">
                                "{msg.content}"
                            </p>
                        ))}
                    </div>

                    {feedback && (
                        <div className="absolute top-24 right-8 w-80 glass-panel p-6 rounded-2xl animate-slide-in-right border-l-4 border-l-yellow-500">
                            <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2 block">Live Feedback</span>
                            <p className="text-sm text-gray-300 italic">"{feedback.critique}"</p>
                        </div>
                    )}
                </div>

                {/* Floating User Cam */}
                <div className="absolute bottom-8 right-8 w-64 h-48 bg-black rounded-2xl overflow-hidden shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)] border border-purple-500/30 z-40 group hover:scale-105 transition-transform duration-500">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1] opacity-80 group-hover:opacity-100 transition-opacity" />
                    {!isCamOn && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-gray-500 z-10">
                            <FaVideoSlash className="text-2xl mb-2" />
                        </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black to-transparent">
                        <p className="text-xs text-white/80 font-mono truncate">{fullTranscript + currentTranscript || "Listening..."}</p>
                    </div>
                </div>
            </div>

            {/* Bottom Controls (Glass Dock) */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-50">
                <div className="glass-panel px-8 py-4 rounded-full flex items-center gap-8 shadow-2xl">
                    <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
                        {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                    </button>

                    <button
                        onClick={toggleListening}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)] ${isListening
                                ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-110 text-white'
                            }`}
                    >
                        {isListening ? <FaStop /> : <FaPlay className="ml-1" />}
                    </button>

                    <button onClick={toggleCamera} className={`p-4 rounded-full transition-all ${isCamOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
                        {isCamOn ? <FaVideo /> : <FaVideoSlash />}
                    </button>

                    <button onClick={handleEndSession} className="p-4 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-all ml-4 border-l border-white/10 pl-8">
                        <FaPhoneSlash />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Interview;
