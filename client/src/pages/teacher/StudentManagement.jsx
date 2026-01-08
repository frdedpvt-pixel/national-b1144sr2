import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Navbar from '../../components/Navbar';

export default function StudentManagement() {
    const [tab, setTab] = useState('pending');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudents();
    }, [tab]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(`/teacher/students/${tab}`);
            setStudents(response.data.students);
        } catch (error) {
            console.error('Failed to fetch students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await apiClient.post(`/teacher/students/${id}/approve`);
            fetchStudents();
        } catch (error) {
            console.error('Failed to approve student:', error);
        }
    };

    const handleReject = async (id) => {
        try {
            await apiClient.post(`/teacher/students/${id}/reject`);
            fetchStudents();
        } catch (error) {
            console.error('Failed to reject student:', error);
        }
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <h1 className="mb-lg">Student Management 👥</h1>

                <div className="flex gap-sm mb-lg">
                    <button
                        onClick={() => setTab('pending')}
                        className={`btn btn-small ${tab === 'pending' ? 'btn-warning' : 'btn-secondary'}`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setTab('approved')}
                        className={`btn btn-small ${tab === 'approved' ? 'btn-success' : 'btn-secondary'}`}
                    >
                        Approved
                    </button>
                    <button
                        onClick={() => setTab('rejected')}
                        className={`btn btn-small ${tab === 'rejected' ? 'btn-danger' : 'btn-secondary'}`}
                    >
                        Rejected
                    </button>
                </div>

                {loading ? (
                    <div className="text-center">
                        <div className="spinner"></div>
                    </div>
                ) : students.length === 0 ? (
                    <div className="card text-center">
                        <p className="text-muted">No {tab} students.</p>
                    </div>
                ) : (
                    <div className="grid grid-2">
                        {students.map(student => (
                            <div key={student.id} className="card">
                                <h4 style={{ marginBottom: '0.5rem' }}>{student.name}</h4>
                                <p className="text-secondary" style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
                                    📧 {student.email}
                                </p>
                                <p className="text-secondary" style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
                                    🏫 Class {student.class} - Section {student.section}
                                </p>
                                <p className="text-secondary" style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
                                    🎫 Roll No: {student.roll_number} | ID: {student.school_id}
                                </p>

                                {/* Display ID Card Photo */}
                                {student.id_card_photo && (
                                    <div className="mt-md">
                                        <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                            📸 School ID Card:
                                        </p>
                                        <img
                                            src={`http://localhost:5001${student.id_card_photo}`}
                                            alt="Student ID Card"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '200px',
                                                borderRadius: '8px',
                                                border: '2px solid var(--color-border)',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    </div>
                                )}

                                {student.blocked_posts_count > 0 && (
                                    <div className="badge badge-error mt-sm">
                                        ⚠️ {student.blocked_posts_count} Flagged Posts
                                    </div>
                                )}

                                {tab === 'pending' && (
                                    <div className="flex gap-sm mt-md">
                                        <button
                                            onClick={() => handleApprove(student.id)}
                                            className="btn btn-success btn-small"
                                            style={{ flex: 1 }}
                                        >
                                            ✓ Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(student.id)}
                                            className="btn btn-danger btn-small"
                                            style={{ flex: 1 }}
                                        >
                                            ✗ Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
