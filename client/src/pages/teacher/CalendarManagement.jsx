import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';
import CalendarView from '../../components/CalendarView';
import UpcomingEvents from '../../components/UpcomingEvents';
import EventDetailModal from '../../components/EventDetailModal';

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

    // Modal state
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);

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
        // If coming from modal, close it
        setModalOpen(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        try {
            await apiClient.delete(`/teacher/calendar/${id}`);
            setModalOpen(false); // Close modal if open
            fetchEvents();
        } catch (error) {
            console.error('Failed to delete event:', error);
        }
    };

    // Calendar Handlers
    const handleDateClick = (date, dayEvents) => {
        setSelectedDate(date);
        setSelectedEvents(dayEvents);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedDate(null);
        setSelectedEvents([]);
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="flex items-center justify-between mb-md">
                    <h1 style={{ margin: 0 }}>Calendar Management 📅</h1>
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
                    <div className="card mb-lg" style={{ animation: 'slideUp 0.3s ease-out' }}>
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
                                    placeholder="e.g., Mathematics Midterm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-md">
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
                            </div>

                            <div className="flex gap-sm mt-md">
                                <button type="submit" className="btn btn-primary">
                                    {editing ? 'Update Event' : 'Create Event'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditing(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {loading ? (
                    <div className="calendar-skeleton">
                        <div className="calendar-skeleton-grid">
                            {Array.from({ length: 35 }).map((_, i) => (
                                <div key={i} className="calendar-skeleton-cell" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <CalendarView
                        events={events}
                        onDateClick={handleDateClick}
                        isTeacher={true}
                        selectedDate={selectedDate} // Highlight selected
                    />
                )}

                {/* Upcoming Events Section */}
                <UpcomingEvents
                    events={events}
                    onEventClick={handleDateClick}
                />

                {/* Event Detail Modal (With Edit/Delete options) */}
                {selectedDate && (
                    <EventDetailModal
                        isOpen={modalOpen}
                        onClose={handleCloseModal}
                        date={selectedDate}
                        events={selectedEvents}
                        isTeacher={true}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )}
            </div>
        </>
    );
}
