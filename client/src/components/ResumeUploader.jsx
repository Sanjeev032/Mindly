import { useState } from 'react';
import axios from 'axios';
import { FaCloudUploadAlt, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const ResumeUploader = ({ onUploadSuccess }) => {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, success, error
    const [message, setMessage] = useState('');

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => {
        setDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) uploadFile(file);
    };

    const uploadFile = async (file) => {
        if (file.type !== 'application/pdf') {
            setStatus('error');
            setMessage('Only PDF files are allowed.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setStatus('idle');
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/resume/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            setStatus('success');
            setMessage('Resume analyzed successfully!');
            if (onUploadSuccess) onUploadSuccess(res.data.data.analysis);
        } catch (err) {
            console.error(err);
            setStatus('error');
            const errMsg = err.response?.data?.error || err.message || 'Upload failed.';
            setMessage(errMsg);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative overflow-hidden group ${dragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600 hover:border-blue-500 hover:bg-gray-800'
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center gap-3">
                {uploading ? (
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
                ) : status === 'success' ? (
                    <FaCheckCircle className="text-4xl text-green-400" />
                ) : status === 'error' ? (
                    <FaExclamationCircle className="text-4xl text-red-500" />
                ) : (
                    <FaCloudUploadAlt className="text-4xl text-gray-400 group-hover:text-blue-400 transition" />
                )}

                <div>
                    <h3 className="font-semibold text-lg text-gray-200">
                        {uploading ? 'Analyzing Resume...' : status === 'success' ? 'Analysis Complete' : 'Upload Resume'}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                        {message || 'Drag & drop PDF or click to browse'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResumeUploader;
