export default function PostCard({ post }) {
    const getTagClass = (tag) => {
        const tagMap = {
            '#Academics': 'tag-academics',
            '#Sports': 'tag-sports',
            '#Art': 'tag-art',
            '#Fest': 'tag-fest',
        };
        return tagMap[tag] || 'badge-primary';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="card">
            <div className="flex items-center gap-md mb-md">
                <img
                    src={post.profile_picture}
                    alt={post.author_name}
                    style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                />
                <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-sm">
                        <p style={{ fontWeight: '600', margin: 0 }}>{post.author_name}</p>
                        {post.author_role === 'teacher' && (
                            <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>✓ Verified</span>
                        )}
                    </div>
                    {post.author_class && (
                        <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                            Class {post.author_class} - Section {post.author_section}
                        </p>
                    )}
                </div>
                <div className="flex flex-col items-end">
                    <span className={`badge ${getTagClass(post.tag)}`}>{post.tag}</span>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {formatDate(post.created_at)}
                    </p>
                </div>
            </div>

            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>{post.content}</p>

            {post.image && (
                <img
                    src={post.image}
                    alt="Post"
                    style={{
                        width: '100%',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1rem'
                    }}
                />
            )}
        </div>
    );
}
