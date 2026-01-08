import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';

export default function CreateAnnouncement() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await apiClient.post('/teacher/announcements', { title, content });
            setSuccess('Announcement created successfully!');
            setTitle('');
            setContent('');
            setTimeout(() => navigate('/teacher'), 2000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create announcement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="container-narrow">
                <h1 className="mb-lg">Create Announcement 📢</h1>

                {error && <div className="alert alert-danger mb-lg">{error}</div>}
                {success && <div className="alert alert-success mb-lg">{success}</div>}

                <div className="card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Announcement Title</label>
                            <input
                                type="text"
                                className="form-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter announcement title"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Content</label>
                            <textarea
                                className="form-textarea"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write your announcement here..."
                                rows="6"
                                required
                            />
                        </div>

                        <div className="flex gap-sm">
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Publishing...' : '📢 Publish Announcement'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/teacher')}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
