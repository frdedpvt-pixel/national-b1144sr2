import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePictureModal({ isOpen, onClose }) {
    const { updateProfilePicture } = useAuth();
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
                setError('Only .jpg, .jpeg, and .png files are allowed');
                return;
            }
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }
            setError('');
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setError('');

        const result = await updateProfilePicture(selectedFile);

        setLoading(false);

        if (result.success) {
            handleClose();
        } else {
            setError(result.error || 'Failed to upload profile picture');
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreview(null);
        setError('');
        setLoading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ margin: 0 }}>📷 Update Profile Picture</h3>
                    <button
                        className="btn-secondary btn-small"
                        onClick={handleClose}
                        style={{ padding: '0.25rem 0.5rem' }}
                    >
                        ✕
                    </button>
                </div>

                <div className="modal-body" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    {preview ? (
                        <div style={{ marginBottom: '1rem' }}>
                            <img
                                src={preview}
                                alt="Preview"
                                style={{
                                    width: '150px',
                                    height: '150px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '3px solid var(--color-primary)'
                                }}
                            />
                        </div>
                    ) : (
                        <div
                            style={{
                                width: '150px',
                                height: '150px',
                                borderRadius: '50%',
                                border: '2px dashed var(--color-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem',
                                color: 'var(--color-text-secondary)'
                            }}
                        >
                            <span style={{ fontSize: '3rem' }}>👤</span>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/jpeg,image/jpg,image/png"
                        style={{ display: 'none' }}
                        id="profile-pic-input"
                    />

                    <label
                        htmlFor="profile-pic-input"
                        className="btn-secondary"
                        style={{ cursor: 'pointer', display: 'inline-block', marginBottom: '1rem' }}
                    >
                        {selectedFile ? 'Choose Different Image' : 'Select Image'}
                    </label>

                    {selectedFile && (
                        <p style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.875rem',
                            marginBottom: '1rem'
                        }}>
                            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                    )}

                    {error && (
                        <p style={{
                            color: 'var(--color-danger)',
                            fontSize: '0.875rem',
                            marginBottom: '1rem'
                        }}>
                            {error}
                        </p>
                    )}

                    <p style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.75rem',
                        marginBottom: '1rem'
                    }}>
                        Accepted formats: JPG, JPEG, PNG (Max 5MB)
                    </p>
                </div>

                <div className="modal-footer" style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'flex-end',
                    borderTop: '1px solid var(--color-border)',
                    padding: '1rem'
                }}>
                    <button
                        className="btn-secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleUpload}
                        disabled={!selectedFile || loading}
                    >
                        {loading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    max-width: 400px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    border-bottom: 1px solid var(--color-border);
                }
            `}</style>
        </div>
    );
}
