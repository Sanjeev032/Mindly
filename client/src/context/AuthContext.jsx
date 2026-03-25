import { createContext, useState, useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
import { GET_ME, LOGIN_USER, REGISTER_USER } from '../graphql/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const client = useApolloClient();

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    const checkUserLoggedIn = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const { data } = await client.query({
                    query: GET_ME,
                    fetchPolicy: 'network-only' // Ensure we get fresh user data
                });
                if (data.me) {
                    setUser(data.me);
                } else {
                    localStorage.removeItem('token');
                    setUser(null);
                }
            } catch (err) {
                console.error('Check user failed:', err);
                localStorage.removeItem('token');
                setUser(null);
            }
        }
        setLoading(false);
    };

    const register = async (userData) => {
        try {
            const { data } = await client.mutate({
                mutation: REGISTER_USER,
                variables: userData
            });
            const { token, user } = data.register;
            localStorage.setItem('token', token);
            setUser(user);
            setError(null);
            return true;
        } catch (err) {
            setError(err.message || 'Registration failed');
            return false;
        }
    };

    const login = async (email, password) => {
        try {
            const { data } = await client.mutate({
                mutation: LOGIN_USER,
                variables: { email, password }
            });
            const { token, user } = data.login;
            localStorage.setItem('token', token);
            setUser(user);
            setError(null);
            return true;
        } catch (err) {
            setError(err.message || 'Login failed');
            return false;
        }
    };

    const logout = async () => {
        localStorage.removeItem('token');
        setUser(null);
        await client.clearStore(); // Clear Apollo cache on logout
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, register, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
