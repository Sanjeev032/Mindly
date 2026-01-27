import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaStream from '../hooks/useMediaStream';
import AudioVisualizer from '../components/AudioVisualizer';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaComments, FaLightbulb } from 'react-icons/fa';

const Interview = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Media & Voice State
    const { stream, isCamOn, isMicOn, toggleCamera, toggleMic, stopMedia } = useMediaStream();
    const [messages, setMessages] = useState([]);
    const [currentTranscript, setCurrentTranscript] = useState(''); // Interim
    const [fullTranscript, setFullTranscript] = useState(''); // Finalized chunks
    const [isListening, setIsListening] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const videoRef = useRef(null);
    const recognitionRef = useRef(null);
    // Ref to hold accumulated text to avoid stale closures in event listeners
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
            recognitionRef.current.continuous = true; // Keep listening
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

            recognitionRef.current.onend = () => {
                // If it stops unexpectedly (silence timeout), we just update state
                // But we manually control setIsListening mostly
            };

            recognitionRef.current.onerror = (data) => {
                console.error("Speech Error:", data);
                if (data.error === 'not-allowed') alert("Microphone access blocked.");
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
        stopMedia(); // Manually kill tracks
        if (recognitionRef.current) recognitionRef.current.abort();
        window.speechSynthesis.cancel();
        navigate('/dashboard');
    };

    return (
        <div className="h-screen bg-black text-gray-200 flex flex-col overflow-hidden">
            <div className="flex-1 flex relative">

                {/* AI Stage */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-900 to-black relative">
                    <AudioVisualizer isSpeaking={isAiSpeaking} />

                    <div className="mt-12 text-center max-w-2xl">
                        {isAiSpeaking && (
                            <p className="text-xl text-blue-200 font-light leading-relaxed animate-fade-in">
                                {messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
                            </p>
                        )}
                    </div>

                    {feedback && (
                        <div className="absolute top-8 left-8 max-w-sm bg-yellow-900/50 border border-yellow-600/50 backdrop-blur-md p-4 rounded-xl animate-slide-in-left">
                            <div className="flex items-center gap-2 mb-2">
                                <FaLightbulb className="text-yellow-400" />
                                <span className="font-bold text-yellow-500">Instant Feedback</span>
                            </div>
                            <div className="text-sm text-yellow-100/80 italic">"{feedback.critique}"</div>
                        </div>
                    )}
                </div>

                {/* User Camera PiP */}
                <div className="absolute bottom-24 right-8 w-64 h-48 bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700 z-10">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                    {!isCamOn && <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-500">Camera Off</div>}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-center">
                        <p className="text-xs text-white truncate">{fullTranscript + currentTranscript || "Listening..."}</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-center gap-8 px-8 z-20">
                <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500'}`}>
                    {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </button>

                <button
                    onClick={toggleListening}
                    className={`px-8 py-4 rounded-full transition-all shadow-lg font-bold text-lg min-w-[200px] ${isListening ? 'bg-red-600 animate-pulse ring-4 ring-red-900/30' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                >
                    {isListening ? "I'm Done (Send)" : "Start Speaking"}
                </button>

                <button onClick={toggleCamera} className={`p-4 rounded-full transition-all ${isCamOn ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500'}`}>
                    {isCamOn ? <FaVideo /> : <FaVideoSlash />}
                </button>

                <div className="w-px h-10 bg-gray-700 mx-4"></div>

                <button onClick={handleEndSession} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition">
                    <FaPhoneSlash /> <span>End Session</span>
                </button>
            </div>
        </div>
    );
};

export default Interview;
