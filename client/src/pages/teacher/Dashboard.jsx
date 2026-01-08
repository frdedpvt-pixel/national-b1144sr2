import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';

export default function TeacherDashboard() {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await apiClient.get('/teacher/dashboard');
            setAlerts(response.data.alerts);
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
                <h1 className="mb-lg">Teacher Dashboard 👨‍🏫</h1>

                <div className="grid grid-2 mb-xl">
                    {/* Pending Approvals Alert */}
                    <div className="card" style={{ background: alerts?.pendingStudents > 0 ? 'rgba(245, 158, 11, 0.1)' : undefined }}>
                        <div className="flex items-center gap-md mb-md">
                            <span style={{ fontSize: '2.5rem' }}>👥</span>
                            <div>
                                <h3 style={{ margin: 0 }}>Pending Approvals</h3>
                                <p className="text-muted" style={{ margin: 0 }}>Student accounts awaiting review</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <h2 style={{ margin: 0, fontSize: '2.5rem' }}>{alerts?.pendingStudents || 0}</h2>
                            <a href="/teacher/students" className="btn btn-warning btn-small">
                                Review →
                            </a>
                        </div>
                    </div>

                    {/* Blocked Posts Alert */}
                    <div className="card" style={{ background: alerts?.blockedPosts > 0 ? 'rgba(239, 68, 68, 0.1)' : undefined }}>
                        <div className="flex items-center gap-md mb-md">
                            <span style={{ fontSize: '2.5rem' }}>🚫</span>
                            <div>
                                <h3 style={{ margin: 0 }}>AI-Blocked Posts</h3>
                                <p className="text-muted" style={{ margin: 0 }}>Posts flagged by moderation</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <h2 style={{ margin: 0, fontSize: '2.5rem' }}>{alerts?.blockedPosts || 0}</h2>
                            <a href="/teacher/moderation" className="btn btn-danger btn-small">
                                Review →
                            </a>
                        </div>
                    </div>
                </div>

                <h3 className="mb-md">Quick Actions</h3>
                <div className="grid grid-3">
                    <a href="/teacher/students" className="btn btn-secondary btn-large" style={{ textDecoration: 'none' }}>
                        👥 Manage Students
                    </a>
                    <a href="/teacher/calendar" className="btn btn-secondary btn-large" style={{ textDecoration: 'none' }}>
                        📅 Manage Calendar
                    </a>
                    <a href="/teacher/announcements/create" className="btn btn-secondary btn-large" style={{ textDecoration: 'none' }}>
                        📢 Create Announcement
                    </a>
                </div>
            </div>
        </>
    );
}
