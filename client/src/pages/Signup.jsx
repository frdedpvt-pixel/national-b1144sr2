import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export default function Signup() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        class: '',
        section: '',
        rollNumber: '',
        schoolId: ''
    });
    const [idCard, setIdCard] = useState(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                setError('Only JPG, JPEG, and PNG files are allowed');
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }

            setIdCard(file);
            setPreview(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!idCard) {
            setError('Please upload your school ID card photo');
            setLoading(false);
            return;
        }

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            data.append('password', formData.password);
            data.append('role', 'student');
            data.append('class', formData.class);
            data.append('section', formData.section);
            data.append('rollNumber', formData.rollNumber);
            data.append('schoolId', formData.schoolId);
            data.append('idCard', idCard);

            const response = await apiClient.post('/auth/register', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: '2rem' }}>
                <div className="card glass" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                    <h2 className="mb-md">Registration Submitted!</h2>
                    <p className="text-secondary mb-lg">
                        Your account has been created and is pending teacher approval.
                        You'll be able to log in once a teacher approves your registration.
                    </p>
                    <p className="text-muted">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: '2rem' }}>
            <div className="card glass" style={{ maxWidth: '700px', width: '100%' }}>
                <div className="text-center mb-lg">
                    <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📝</h1>
                    <h2 style={{ marginBottom: '0.5rem' }}>Student Sign Up</h2>
                    <p className="text-secondary">Register and wait for teacher approval</p>
                </div>

                {error && (
                    <div className="alert alert-danger mb-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-2 gap-md">
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Email Address *</label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="john@student.edu"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Password *</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                minLength="6"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Class *</label>
                            <input
                                type="text"
                                name="class"
                                className="form-input"
                                value={formData.class}
                                onChange={handleChange}
                                placeholder="10"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Section *</label>
                            <input
                                type="text"
                                name="section"
                                className="form-input"
                                value={formData.section}
                                onChange={handleChange}
                                placeholder="A"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Roll Number *</label>
                            <input
                                type="text"
                                name="rollNumber"
                                className="form-input"
                                value={formData.rollNumber}
                                onChange={handleChange}
                                placeholder="101"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">School ID *</label>
                            <input
                                type="text"
                                name="schoolId"
                                className="form-input"
                                value={formData.schoolId}
                                onChange={handleChange}
                                placeholder="STU123"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">School ID Card Photo *</label>
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={handleFileChange}
                                className="form-input"
                                required
                            />
                            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Upload a clear photo of your school ID card (JPG, PNG • Max 5MB)
                            </p>
                        </div>

                        {preview && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                                <img
                                    src={preview}
                                    alt="ID Card Preview"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '300px',
                                        borderRadius: '8px',
                                        border: '2px solid var(--color-border)'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary mt-lg"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : 'Register'}
                    </button>
                </form>

                <div className="text-center mt-lg">
                    <p className="text-secondary">
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '500' }}>
                            Log In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
