import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';

export default function Announcements() {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const response = await apiClient.get('/student/announcements');
            setAnnouncements(response.data.announcements);
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <h1 className="mb-lg">School Announcements 📢</h1>

                {loading ? (
                    <div className="text-center">
                        <div className="spinner"></div>
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="card text-center">
                        <p className="text-muted">No announcements yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-md">
                        {announcements.map(announcement => (
                            <div key={announcement.id} className="card">
                                <div className="flex items-center gap-sm mb-md">
                                    <span className="badge badge-success">✓ Verified by School</span>
                                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        By {announcement.author_name}
                                    </span>
                                </div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{announcement.title}</h3>
                                <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>{announcement.content}</p>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                                    Posted on {formatDate(announcement.created_at)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
