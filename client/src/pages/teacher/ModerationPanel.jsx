import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';

export default function ModerationPanel() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlockedPosts();
    }, []);

    const fetchBlockedPosts = async () => {
        try {
            const response = await apiClient.get('/teacher/moderation/blocked');
            setPosts(response.data.posts);
        } catch (error) {
            console.error('Failed to fetch blocked posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await apiClient.post(`/teacher/moderation/${id}/approve`);
            fetchBlockedPosts();
        } catch (error) {
            console.error('Failed to approve post:', error);
        }
    };

    const handleReject = async (id) => {
        try {
            await apiClient.post(`/teacher/moderation/${id}/reject`);
            fetchBlockedPosts();
        } catch (error) {
            console.error('Failed to reject post:', error);
        }
    };

    const getTagClass = (tag) => {
        const tagMap = {
            '#Academics': 'tag-academics',
            '#Sports': 'tag-sports',
            '#Art': 'tag-art',
            '#Fest': 'tag-fest',
        };
        return tagMap[tag] || 'badge-primary';
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <h1 className="mb-lg">AI Moderation Review 🚫</h1>

                {loading ? (
                    <div className="text-center">
                        <div className="spinner"></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="card text-center">
                        <p className="text-muted">No blocked posts to review.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-md">
                        {posts.map(post => (
                            <div key={post.id} className="card">
                                <div className="flex items-center justify-between mb-md">
                                    <div>
                                        <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                            {post.author_name}
                                            <span className="text-secondary" style={{ fontWeight: 'normal', marginLeft: '0.5rem' }}>
                                                Class {post.class} - Section {post.section}
                                            </span>
                                        </p>
                                        <span className={`badge ${getTagClass(post.tag)}`}>{post.tag}</span>
                                    </div>
                                    <span className="badge badge-danger">Blocked by AI</span>
                                </div>

                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: '#fca5a5', marginBottom: '0.5rem' }}>
                                        🚫 Moderation Reason: {post.moderation_reason}
                                    </p>
                                    <p style={{ margin: 0, lineHeight: '1.6' }}>{post.content}</p>
                                </div>

                                {post.image && (
                                    <img
                                        src={post.image}
                                        alt="Post"
                                        style={{
                                            width: '100%',
                                            maxWidth: '400px',
                                            borderRadius: 'var(--radius-md)',
                                            marginBottom: '1rem'
                                        }}
                                    />
                                )}

                                <div className="flex gap-sm">
                                    <button
                                        onClick={() => handleApprove(post.id)}
                                        className="btn btn-success btn-small"
                                        style={{ flex: 1 }}
                                    >
                                        ✓ Approve & Publish
                                    </button>
                                    <button
                                        onClick={() => handleReject(post.id)}
                                        className="btn btn-danger btn-small"
                                        style={{ flex: 1 }}
                                    >
                                        ✗ Permanently Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
