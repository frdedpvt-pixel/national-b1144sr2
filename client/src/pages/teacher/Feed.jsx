import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';
import PostCard from '../../components/PostCard';

export default function TeacherFeed() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [newPost, setNewPost] = useState({
        content: '',
        tag: '#Academics',
        imageFile: null,
        imagePreview: null
    });

    const [activeTag, setActiveTag] = useState('All');

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        try {
            const response = await apiClient.get('/teacher/feed');
            setPosts(response.data.posts);
        } catch (error) {
            console.error('Failed to fetch feed:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredPosts = activeTag === 'All'
        ? posts
        : posts.filter(post => post.tag === activeTag);

    const tags = ['All', '#Academics', '#Sports', '#Art', '#Fest', '#Help'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setPosting(true);

        try {
            // Create FormData for multipart/form-data
            const formData = new FormData();
            formData.append('content', newPost.content);
            formData.append('tag', newPost.tag);

            // Add image file if selected
            if (newPost.imageFile) {
                formData.append('image', newPost.imageFile);
            }

            const response = await apiClient.post('/teacher/post', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSuccess(response.data.message);
            setNewPost({ content: '', tag: '#Academics', imageFile: null, imagePreview: null });
            setShowForm(false);
            // Refresh feed
            fetchFeed();
            setActiveTag('All'); // Reset filter
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
                <div className="flex items-center justify-between mb-md">
                    <h1>School Feed 📱</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn btn-primary"
                    >
                        {showForm ? 'Cancel' : '✍️ Create Post'}
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="flex gap-sm mb-lg" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {tags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => setActiveTag(tag)}
                            className={`btn btn-small ${activeTag === tag ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                                borderRadius: '20px',
                                whiteSpace: 'nowrap',
                                opacity: activeTag === tag ? 1 : 0.7
                            }}
                        >
                            {tag}
                        </button>
                    ))}
                </div>

                {showForm && (
                    <div className="card mb-lg">
                        <h3 className="mb-md">Create New Post</h3>
                        <div className="alert alert-info mb-md">
                            ✓ Your posts are automatically approved (no AI moderation)
                        </div>

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
                                    <option value="#Help">🆘 #Help</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Image Upload (Optional)</label>
                                <input
                                    type="file"
                                    className="form-input"
                                    accept=".jpg,.jpeg,.png"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            // Validate file type
                                            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                                            if (!validTypes.includes(file.type)) {
                                                setError('Invalid file type. Only JPG, JPEG, and PNG images are allowed.');
                                                e.target.value = '';
                                                return;
                                            }

                                            // Validate file size (5MB max)
                                            if (file.size > 5 * 1024 * 1024) {
                                                setError('File size too large. Maximum size is 5MB.');
                                                e.target.value = '';
                                                return;
                                            }

                                            // Create preview
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setNewPost({
                                                    ...newPost,
                                                    imageFile: file,
                                                    imagePreview: reader.result
                                                });
                                            };
                                            reader.readAsDataURL(file);
                                            setError('');
                                        }
                                    }}
                                />
                                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                    Supported formats: JPG, JPEG, PNG (Max 5MB)
                                </p>

                                {newPost.imagePreview && (
                                    <div style={{ marginTop: '1rem', position: 'relative' }}>
                                        <img
                                            src={newPost.imagePreview}
                                            alt="Preview"
                                            style={{
                                                width: '100%',
                                                maxHeight: '300px',
                                                objectFit: 'cover',
                                                borderRadius: 'var(--radius-md)'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setNewPost({ ...newPost, imageFile: null, imagePreview: null })}
                                            className="btn btn-danger"
                                            style={{ marginTop: '0.5rem' }}
                                        >
                                            Remove Image
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={posting}>
                                {posting ? 'Publishing...' : 'Publish Post'}
                            </button>
                        </form >
                    </div >
                )
                }

                {
                    loading ? (
                        <div className="text-center">
                            <div className="spinner"></div>
                        </div>
                    ) : filteredPosts.length === 0 ? (
                        <div className="card text-center">
                            <p className="text-muted">
                                {activeTag === 'All'
                                    ? "No posts yet. Be the first to share something!"
                                    : `No posts under ${activeTag} category yet.`}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-md">
                            {filteredPosts.map(post => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    )
                }
            </div >
        </>
    );
}
