import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfilePictureModal from './ProfilePictureModal';

export default function Navbar() {
    const { user, logout, isStudent, isTeacher } = useAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);

    return (
        <>
            <nav className="glass" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '2rem' }}>
                <div className="container">
                    <div className="flex items-center justify-between" style={{ padding: '1rem 0' }}>
                        <Link to={isStudent ? '/student' : '/teacher'} style={{ textDecoration: 'none' }}>
                            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
                                <span>🏫</span> School Network
                            </h2>
                        </Link>

                        <div className="flex items-center gap-md">
                            {isStudent && (
                                <>
                                    <Link to="/student" className="btn-secondary btn-small">Dashboard</Link>
                                    <Link to="/student/feed" className="btn-secondary btn-small">Feed</Link>
                                    <Link to="/student/calendar" className="btn-secondary btn-small">Calendar</Link>
                                    <Link to="/student/announcements" className="btn-secondary btn-small">Announcements</Link>
                                </>
                            )}

                            {isTeacher && (
                                <>
                                    <Link to="/teacher" className="btn-secondary btn-small">Dashboard</Link>
                                    <Link to="/teacher/feed" className="btn-secondary btn-small">Feed</Link>
                                    <Link to="/teacher/students" className="btn-secondary btn-small">Students</Link>
                                    <Link to="/teacher/moderation" className="btn-secondary btn-small">Moderation</Link>
                                    <Link to="/teacher/calendar" className="btn-secondary btn-small">Calendar</Link>
                                </>
                            )}

                            <div className="flex items-center gap-sm">
                                <img
                                    src={user?.profile_picture}
                                    alt={user?.name}
                                    onClick={() => setShowProfileModal(true)}
                                    title="Click to change profile picture"
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        border: '2px solid transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'scale(1.1)';
                                        e.target.style.boxShadow = '0 0 10px var(--color-primary)';
                                        e.target.style.borderColor = 'var(--color-primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'scale(1)';
                                        e.target.style.boxShadow = 'none';
                                        e.target.style.borderColor = 'transparent';
                                    }}
                                />
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                    {user?.name}
                                </span>
                            </div>

                            <button onClick={logout} className="btn-danger btn-small">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <ProfilePictureModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
        </>
    );
}

