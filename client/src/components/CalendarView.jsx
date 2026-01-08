import { useState } from 'react';
import '../styles/calendar.css';

export default function CalendarView({ events = [], onDateClick, isTeacher = false }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Get calendar data for current month
    const getCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);

        // Start from previous month's days to fill the first week
        const startDay = new Date(firstDay);
        startDay.setDate(startDay.getDate() - firstDay.getDay());

        // End at next month's days to fill the last week
        const endDay = new Date(lastDay);
        endDay.setDate(endDay.getDate() + (6 - lastDay.getDay()));

        const days = [];
        const current = new Date(startDay);

        while (current <= endDay) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
    };

    // Get events for a specific date
    const getEventsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return events.filter(event => event.date === dateStr);
    };

    // Check if date is today
    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    // Check if date is in current month
    const isCurrentMonth = (date) => {
        return date.getMonth() === currentDate.getMonth();
    };

    // Navigate to previous month
    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    // Navigate to next month
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Go to today
    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Format month and year
    const formatMonthYear = () => {
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Get event pill class based on type
    const getEventPillClass = (type) => {
        return `event-pill event-pill-${type}`;
    };

    const days = getCalendarDays();
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="calendar-wrapper">
            {/* Header */}
            <div className="calendar-header">
                <h2>{formatMonthYear()}</h2>
                <div className="calendar-nav">
                    <button
                        className="calendar-nav-btn"
                        onClick={previousMonth}
                        aria-label="Previous month"
                    >
                        ‹
                    </button>
                    <button
                        className="calendar-today-btn"
                        onClick={goToToday}
                    >
                        Today
                    </button>
                    <button
                        className="calendar-nav-btn"
                        onClick={nextMonth}
                        aria-label="Next month"
                    >
                        ›
                    </button>
                </div>
            </div>

            {/* Weekday Headers */}
            <div className="calendar-weekdays">
                {weekdays.map(day => (
                    <div key={day} className="calendar-weekday">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
                {days.map((date, index) => {
                    const dayEvents = getEventsForDate(date);
                    const hasEvents = dayEvents.length > 0;
                    const cellClass = `calendar-cell ${!isCurrentMonth(date) ? 'other-month' : ''
                        } ${isToday(date) ? 'today' : ''}`;

                    return (
                        <div
                            key={index}
                            className={cellClass}
                            onClick={() => hasEvents && onDateClick(date, dayEvents)}
                            style={{ cursor: hasEvents ? 'pointer' : 'default' }}
                        >
                            <div className="calendar-date">
                                {date.getDate()}
                            </div>

                            {/* Event Pills */}
                            {hasEvents && (
                                <div className="calendar-events">
                                    {dayEvents.slice(0, 3).map(event => (
                                        <div
                                            key={event.id}
                                            className={getEventPillClass(event.type)}
                                            title={event.title}
                                        >
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="event-more">
                                            +{dayEvents.length - 3} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
