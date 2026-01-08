import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';

export default function Calendar() {
    const [events, setEvents] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCalendar();
    }, [filter]);

    const fetchCalendar = async () => {
        try {
            const url = filter === 'all' ? '/student/calendar' : `/student/calendar?type=${filter}`;
            const response = await apiClient.get(url);
            setEvents(response.data.events);
        } catch (error) {
            console.error('Failed to fetch calendar:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEventBadgeClass = (type) => {
        const typeMap = {
            exam: 'badge-exam',
            holiday: 'badge-holiday',
            sports: 'badge-sports',
        };
        return typeMap[type] || 'badge-primary';
    };

    const getEventIcon = (type) => {
        const iconMap = {
            exam: '📝',
            holiday: '🎊',
            sports: '⚽',
        };
        return iconMap[type] || '📅';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <h1 className="mb-md">School Calendar 📅</h1>

                <div className="flex gap-sm mb-lg flex-wrap">
                    <button
                        onClick={() => setFilter('all')}
                        className={`btn btn-small ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        All Events
                    </button>
                    <button
                        onClick={() => setFilter('exam')}
                        className={`btn btn-small ${filter === 'exam' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        📝 Exams
                    </button>
                    <button
                        onClick={() => setFilter('holiday')}
                        className={`btn btn-small ${filter === 'holiday' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        🎊 Holidays
                    </button>
                    <button
                        onClick={() => setFilter('sports')}
                        className={`btn btn-small ${filter === 'sports' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        ⚽ Sports/Cultural
                    </button>
                </div>

                {loading ? (
                    <div className="text-center">
                        <div className="spinner"></div>
                    </div>
                ) : events.length === 0 ? (
                    <div className="card text-center">
                        <p className="text-muted">No events scheduled yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-md">
                        {events.map(event => (
                            <div key={event.id} className="card">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-md">
                                        <span style={{ fontSize: '2rem' }}>{getEventIcon(event.type)}</span>
                                        <div>
                                            <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>{event.title}</h4>
                                            <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>
                                                {formatDate(event.date)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`badge ${getEventBadgeClass(event.type)}`}>
                                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
