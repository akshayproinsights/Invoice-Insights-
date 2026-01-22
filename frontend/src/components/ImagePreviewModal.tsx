import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface ImagePreviewModalProps {
    isOpen: boolean;
    files: File[];
    currentIndex: number;
    onClose: () => void;
    onDelete: (index: number) => void;
    onNavigate: (newIndex: number) => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
    isOpen,
    files,
    currentIndex,
    onClose,
    onDelete,
    onNavigate,
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                onNavigate(currentIndex - 1);
            } else if (e.key === 'ArrowRight' && currentIndex < files.length - 1) {
                onNavigate(currentIndex + 1);
            }
        },
        [isOpen, currentIndex, files.length, onClose, onNavigate]
    );

    // Add keyboard event listener
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleDelete = () => {
        onDelete(currentIndex);
        setShowDeleteConfirm(false);
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < files.length - 1) {
            onNavigate(currentIndex + 1);
        }
    };

    if (!isOpen || files.length === 0) return null;

    const currentFile = files[currentIndex];
    const imageUrl = currentFile ? URL.createObjectURL(currentFile) : '';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Modal Content */}
            <div
                className="relative w-full h-full flex items-center justify-center p-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all shadow-lg hover:scale-110"
                    title="Close (ESC)"
                >
                    <X size={24} />
                </button>

                {/* Image Counter */}
                <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    {currentIndex + 1} / {files.length}
                </div>

                {/* Delete Button */}
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 transition-all shadow-lg flex items-center gap-2 font-medium"
                    title="Delete Image"
                >
                    <Trash2 size={18} />
                    Delete
                </button>

                {/* Previous Button */}
                {currentIndex > 0 && (
                    <button
                        onClick={handlePrevious}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-4 transition-all shadow-lg hover:scale-110"
                        title="Previous (←)"
                    >
                        <ChevronLeft size={32} />
                    </button>
                )}

                {/* Next Button */}
                {currentIndex < files.length - 1 && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-4 transition-all shadow-lg hover:scale-110"
                        title="Next (→)"
                    >
                        <ChevronRight size={32} />
                    </button>
                )}

                {/* Image Display */}
                <div className="max-w-7xl max-h-full flex items-center justify-center">
                    <img
                        src={imageUrl}
                        alt={currentFile?.name || 'Preview'}
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                {/* File Name */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm max-w-md truncate">
                    {currentFile?.name}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50"
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <div
                        className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Delete this image?
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to remove "{currentFile?.name}"? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImagePreviewModal;
