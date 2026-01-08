import { useEffect } from 'react';
import '../styles/calendar.css';

export default function EventDetailModal({
    isOpen,
    onClose,
    date,
    events = [],
    isTeacher = false,
    onEdit,
    onDelete
}) {
    // Close on ESC key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Format date for header
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Get event icon
    const getEventIcon = (type) => {
        const iconMap = {
            exam: '📝',
            holiday: '🎊',
            sports: '⚽',
        };
        return iconMap[type] || '📅';
    };

    // Get event type label
    const getEventTypeLabel = (type) => {
        const labelMap = {
            exam: 'Exam',
            holiday: 'Holiday',
            sports: 'Sports'
        };
        return labelMap[type] || type;
    };

    return (
        <div
            className="event-modal-overlay"
            onClick={onClose}
        >
            <div
                className="event-modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="event-modal-header">
                    <h3>{formatDate(date)}</h3>
                    <button
                        className="event-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Modal Body */}
                <div className="event-modal-body">
                    {events.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                            No events on this date
                        </div>
                    ) : (
                        events.map((event, index) => (
                            <div key={event.id} className="event-detail-card">
                                <div className="event-detail-header">
                                    <div className="event-detail-icon">
                                        {getEventIcon(event.type)}
                                    </div>
                                    <div className="event-detail-info">
                                        <h4 className="event-detail-title">{event.title}</h4>
                                        <span className={`event-detail-type ${event.type}`}>
                                            {getEventTypeLabel(event.type)}
                                        </span>
                                    </div>
                                </div>

                                {/* Event Image (if available) */}
                                {event.image ? (
                                    <div className="event-detail-image">
                                        <img
                                            src={`http://localhost:5001${event.image}`}
                                            alt={event.title}
                                        />
                                    </div>
                                ) : (
                                    <div className="event-detail-no-image">
                                        No image provided
                                    </div>
                                )}

                                {/* Teacher Actions */}
                                {isTeacher && (
                                    <div className="event-detail-actions">
                                        <button
                                            className="btn btn-secondary btn-small"
                                            onClick={() => {
                                                onEdit(event);
                                                onClose();
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-danger btn-small"
                                            onClick={() => {
                                                onDelete(event.id);
                                                onClose();
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
