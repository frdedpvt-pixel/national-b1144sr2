import { useState, useEffect } from 'react';

export default function UpcomingEvents({ events, onEventClick }) {
    const [upcomingEvents, setUpcomingEvents] = useState([]);

    useEffect(() => {
        if (events) {
            filterUpcomingEvents();
        }
    }, [events]);

    const filterUpcomingEvents = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30); // 30 days direct lookahead

        const filtered = events.filter(event => {
            const eventDate = new Date(event.date);
            // Include today and next 30 days
            return eventDate >= today && eventDate <= nextMonth;
        });

        // Sort by date ascending (nearest first)
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

        setUpcomingEvents(filtered);
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'exam': return 'var(--color-error)';
            case 'holiday': return 'var(--color-success)';
            case 'sports': return 'var(--color-primary)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return {
            day: date.getDate(),
            month: date.toLocaleString('default', { month: 'short' }).toUpperCase()
        };
    };

    if (upcomingEvents.length === 0) {
        return (
            <div className="card mt-lg">
                <h3 className="mb-md">Upcoming Events</h3>
                <p className="text-muted text-center" style={{ padding: '1rem' }}>
                    No upcoming events in the next 30 days.
                </p>
            </div>
        );
    }

    return (
        <div className="card mt-lg">
            <h3 className="mb-md">Upcoming Events</h3>
            <div className="grid grid-2 gap-md">
                {upcomingEvents.map(event => {
                    const { day, month } = formatDate(event.date);
                    const color = getTypeColor(event.type);

                    return (
                        <div
                            key={event.id}
                            className="card zoom-hover cursor-pointer"
                            onClick={() => onEventClick(event.date, [event])}
                            style={{
                                padding: '0.75rem',
                                borderLeft: `4px solid ${color}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem'
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: '40px',
                                lineHeight: 1
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>
                                    {month}
                                </span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    {day}
                                </span>
                            </div>

                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>{event.title}</h4>
                                <span className="badge mt-xs" style={{
                                    backgroundColor: `${color}20`,
                                    color: color,
                                    fontSize: '0.7rem',
                                    padding: '0.2rem 0.5rem'
                                }}>
                                    {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
