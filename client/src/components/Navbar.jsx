import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout, isStudent, isTeacher } = useAuth();

    return (
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
                                <Link to="/teacher/students" className="btn-secondary btn-small">Students</Link>
                                <Link to="/teacher/moderation" className="btn-secondary btn-small">Moderation</Link>
                                <Link to="/teacher/calendar" className="btn-secondary btn-small">Calendar</Link>
                            </>
                        )}

                        <div className="flex items-center gap-sm">
                            <img
                                src={user?.profile_picture}
                                alt={user?.name}
                                style={{ width: '32px', height: '32px', borderRadius: '50%' }}
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
    );
}
