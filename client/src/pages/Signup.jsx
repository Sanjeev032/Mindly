import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

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
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-bold mb-6 text-center text-green-400">Sign Up</h2>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 mb-1">Name</label>
                        <input name="name" onChange={handleChange} className="w-full bg-gray-700 p-2 rounded" required />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1">Email</label>
                        <input name="email" type="email" onChange={handleChange} className="w-full bg-gray-700 p-2 rounded" required />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1">Password</label>
                        <input name="password" type="password" onChange={handleChange} className="w-full bg-gray-700 p-2 rounded" required />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1">Target Role</label>
                        <select name="targetRole" onChange={handleChange} className="w-full bg-gray-700 p-2 rounded">
                            <option value="Software Engineer">Software Engineer</option>
                            <option value="Product Manager">Product Manager</option>
                            <option value="Data Scientist">Data Scientist</option>
                            <option value="Designer">Designer</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded transition">
                        Sign Up
                    </button>
                </form>
                <p className="mt-4 text-center text-gray-400">
                    Already have an account? <Link to="/login" className="text-green-400 hover:underline">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
