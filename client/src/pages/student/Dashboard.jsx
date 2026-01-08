import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';

export default function StudentDashboard() {
    const { user } = useAuth();
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await apiClient.get('/student/dashboard');
            setSnapshot(response.data.snapshot);
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container text-center">
                    <div className="spinner"></div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="mb-lg">
                    <h1 style={{ marginBottom: '0.5rem' }}>
                        Welcome back, {user?.name}! 👋
                    </h1>
                    <p className="text-secondary">
                        Class {user?.class} - Section {user?.section}
                    </p>
                </div>

                <h3 className="mb-md">Today's Snapshot</h3>
                <div className="grid grid-3 mb-xl">
                    {/* Next Exam Card */}
                    <div className="card">
                        <div className="flex items-center gap-md mb-md">
                            <span style={{ fontSize: '2rem' }}>📝</span>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>Next Exam</h4>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>Upcoming Test</p>
                            </div>
                        </div>
                        {snapshot?.nextExam ? (
                            <>
                                <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{snapshot.nextExam.title}</p>
                                <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>
                                    {new Date(snapshot.nextExam.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                            </>
                        ) : (
                            <p className="text-muted">No upcoming exams</p>
                        )}
                    </div>

                    {/* Upcoming Event Card */}
                    <div className="card">
                        <div className="flex items-center gap-md mb-md">
                            <span style={{ fontSize: '2rem' }}>🎉</span>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>Upcoming Event</h4>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>Next Activity</p>
                            </div>
                        </div>
                        {snapshot?.upcomingEvent ? (
                            <>
                                <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{snapshot.upcomingEvent.title}</p>
                                <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>
                                    {new Date(snapshot.upcomingEvent.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                            </>
                        ) : (
                            <p className="text-muted">No upcoming events</p>
                        )}
                    </div>

                    {/* Latest Announcement Card */}
                    <div className="card">
                        <div className="flex items-center gap-md mb-md">
                            <span style={{ fontSize: '2rem' }}>📢</span>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>Latest Announcement</h4>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>From School</p>
                            </div>
                        </div>
                        {snapshot?.latestAnnouncement ? (
                            <>
                                <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{snapshot.latestAnnouncement.title}</p>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                                    By {snapshot.latestAnnouncement.author}
                                </p>
                            </>
                        ) : (
                            <p className="text-muted">No announcements yet</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-2">
                    <a href="/student/feed" className="btn btn-primary btn-large" style={{ textDecoration: 'none' }}>
                        📱 School Feed
                    </a>
                    <a href="/student/calendar" className="btn btn-secondary btn-large" style={{ textDecoration: 'none' }}>
                        📅 View Calendar
                    </a>
                </div>
            </div>
        </>
    );
}
