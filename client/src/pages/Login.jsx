import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            // Redirect based on role
            navigate(result.user.role === 'student' ? '/student' : '/teacher');
        } else {
            setError(result.error + (result.message ? `: ${result.message}` : ''));
        }

        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: '2rem' }}>
            <div className="card glass" style={{ maxWidth: '450px', width: '100%' }}>
                <div className="text-center mb-lg">
                    <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏫</h1>
                    <h2 style={{ marginBottom: '0.5rem' }}>School Network</h2>
                    <p className="text-secondary">Sign in to your account</p>
                </div>

                {error && (
                    <div className="alert alert-danger mb-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@school.edu"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--color-primary-light)' }}>
                        Demo Credentials:
                    </p>
                    <p style={{ fontSize: '0.75rem', margin: '0.25rem 0', color: 'var(--color-text-secondary)' }}>
                        <strong>Teacher:</strong> teacher1@school.edu / teacher123
                    </p>
                    <p style={{ fontSize: '0.75rem', margin: '0.25rem 0', color: 'var(--color-text-secondary)' }}>
                        <strong>Student:</strong> priya@student.edu / student123
                    </p>
                </div>

                <div className="text-center mt-lg">
                    <p className="text-secondary">
                        Don't have an account?{' '}
                        <Link to="/signup" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '500' }}>
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
