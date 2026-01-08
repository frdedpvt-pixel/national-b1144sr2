import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';

export default function CalendarManagement() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        type: 'exam'
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await apiClient.get('/teacher/calendar');
            setEvents(response.data.events);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await apiClient.put(`/teacher/calendar/${editing}`, formData);
            } else {
                await apiClient.post('/teacher/calendar', formData);
            }
            setFormData({ title: '', date: '', type: 'exam' });
            setShowForm(false);
            setEditing(null);
            fetchEvents();
        } catch (error) {
            console.error('Failed to save event:', error);
        }
    };

    const handleEdit = (event) => {
        setFormData({
            title: event.title,
            date: event.date,
            type: event.type
        });
        setEditing(event.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        try {
            await apiClient.delete(`/teacher/calendar/${id}`);
            fetchEvents();
        } catch (error) {
            console.error('Failed to delete event:', error);
        }
    };

    const getBadgeClass = (type) => {
        const typeMap = {
            exam: 'badge-exam',
            holiday: 'badge-holiday',
            sports: 'badge-sports',
        };
        return typeMap[type] || 'badge-primary';
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="flex items-center justify-between mb-lg">
                    <h1>Calendar Management 📅</h1>
                    <button
                        onClick={() => {
                            setShowForm(!showForm);
                            setEditing(null);
                            setFormData({ title: '', date: '', type: 'exam' });
                        }}
                        className="btn btn-primary"
                    >
                        {showForm ? 'Cancel' : '➕ Create Event'}
                    </button>
                </div>

                {showForm && (
                    <div className="card mb-lg">
                        <h3 className="mb-md">{editing ? 'Edit Event' : 'Create New Event'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Event Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Event Type</label>
                                <select
                                    className="form-select"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    required
                                >
                                    <option value="exam">📝 Exam/Test (Red)</option>
                                    <option value="holiday">🎊 Holiday/Festival (Green)</option>
                                    <option value="sports">⚽ Sports/Cultural (Blue)</option>
                                </select>
                            </div>

                            <button type="submit" className="btn btn-primary">
                                {editing ? 'Update Event' : 'Create Event'}
                            </button>
                        </form>
                    </div>
                )}

                {loading ? (
                    <div className="text-center">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-md">
                        {events.map(event => (
                            <div key={event.id} className="card">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>{event.title}</h4>
                                        <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>
                                            {new Date(event.date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-sm">
                                        <span className={`badge ${getBadgeClass(event.type)}`}>
                                            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                        </span>
                                        <button
                                            onClick={() => handleEdit(event)}
                                            className="btn btn-secondary btn-small"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(event.id)}
                                            className="btn btn-danger btn-small"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
