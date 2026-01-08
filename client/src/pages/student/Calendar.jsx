import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';
import CalendarView from '../../components/CalendarView';
import UpcomingEvents from '../../components/UpcomingEvents';
import EventDetailModal from '../../components/EventDetailModal';

export default function Calendar() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        fetchCalendar();
    }, []);

    const fetchCalendar = async () => {
        try {
            const response = await apiClient.get('/student/calendar');
            setEvents(response.data.events);
        } catch (error) {
            console.error('Failed to fetch calendar:', error);
        } finally {
            setLoading(false);
        }
    };

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
                <h1 className="mb-lg">School Calendar 📅</h1>

                {loading ? (
                    <div className="calendar-skeleton">
                        <div className="calendar-skeleton-grid">
                            {Array.from({ length: 35 }).map((_, i) => (
                                <div key={i} className="calendar-skeleton-cell" />
                            ))}
                        </div>
                    </div>
                ) : events.length === 0 ? (
                    <div className="calendar-empty-state">
                        <div className="calendar-empty-state-icon">📅</div>
                        <div className="calendar-empty-state-text">
                            No events scheduled yet
                        </div>
                    </div>
                ) : (
                    <CalendarView
                        events={events}
                        onDateClick={handleDateClick}
                        isTeacher={false}
                    />
                )}

                {/* Upcoming Events Section */}
                <UpcomingEvents
                    events={events}
                    onEventClick={handleDateClick}
                />

                {/* Event Detail Modal */}
                {selectedDate && (
                    <EventDetailModal
                        isOpen={modalOpen}
                        onClose={handleCloseModal}
                        date={selectedDate}
                        events={selectedEvents}
                        isTeacher={false}
                    />
                )}
            </div>
        </>
    );
}
