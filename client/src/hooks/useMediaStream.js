import { useState, useEffect, useRef } from 'react';

const useMediaStream = () => {
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [isCamOn, setIsCamOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);

    // Use Ref to track stream for cleanup regardless of render cycle
    const streamRef = useRef(null);

    useEffect(() => {
        const initStream = async () => {
            try {
                const localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                streamRef.current = localStream;
                setStream(localStream);
            } catch (err) {
                console.error("Media Access Error:", err);
                setError(err);
            }
        };

        if (!streamRef.current) {
            initStream();
        }

        // Cleanup on unmount
        return () => {
            stopMedia();
        };
    }, []);

    const stopMedia = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            streamRef.current = null;
            setStream(null);
        }
    };

    const toggleCamera = () => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach(track => track.enabled = !isCamOn);
            setIsCamOn(!isCamOn);
        }
    };

    const toggleMic = () => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach(track => track.enabled = !isMicOn);
            setIsMicOn(!isMicOn);
        }
    };

    return { stream, error, isCamOn, isMicOn, toggleCamera, toggleMic, stopMedia };
};

export default useMediaStream;
