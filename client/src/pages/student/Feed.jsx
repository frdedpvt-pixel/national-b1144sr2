import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';
import PostCard from '../../components/PostCard';

export default function Feed() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [newPost, setNewPost] = useState({
        content: '',
        tag: '#Academics',
        image: ''
    });

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        try {
            const response = await apiClient.get('/student/feed');
            setPosts(response.data.posts);
        } catch (error) {
            console.error('Failed to fetch feed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setPosting(true);

        try {
            const response = await apiClient.post('/student/post', newPost);
            setSuccess(response.data.message);
            setNewPost({ content: '', tag: '#Academics', image: '' });
            setShowForm(false);
            // Refresh feed
            fetchFeed();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create post');
        } finally {
            setPosting(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="flex items-center justify-between mb-lg">
                    <h1>School Feed 📱</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn btn-primary"
                    >
                        {showForm ? 'Cancel' : '✍️ Create Post'}
                    </button>
                </div>

                {showForm && (
                    <div className="card mb-lg">
                        <h3 className="mb-md">Create New Post</h3>

                        {error && <div className="alert alert-danger mb-md">{error}</div>}
                        {success && <div className="alert alert-success mb-md">{success}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Content</label>
                                <textarea
                                    className="form-textarea"
                                    value={newPost.content}
                                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                    placeholder="Share something with your school..."
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Tag (Required)</label>
                                <select
                                    className="form-select"
                                    value={newPost.tag}
                                    onChange={(e) => setNewPost({ ...newPost, tag: e.target.value })}
                                    required
                                >
                                    <option value="#Academics">📚 #Academics</option>
                                    <option value="#Sports">⚽ #Sports</option>
                                    <option value="#Art">🎨 #Art</option>
                                    <option value="#Fest">🎉 #Fest</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Image URL (Optional)</label>
                                <input
                                    type="url"
                                    className="form-input"
                                    value={newPost.image}
                                    onChange={(e) => setNewPost({ ...newPost, image: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={posting}>
                                {posting ? 'Publishing...' : 'Publish Post'}
                            </button>
                        </form>
                    </div>
                )}

                {loading ? (
                    <div className="text-center">
                        <div className="spinner"></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="card text-center">
                        <p className="text-muted">No posts yet. Be the first to share something!</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-md">
                        {posts.map(post => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
