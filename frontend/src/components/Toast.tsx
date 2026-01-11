import React, { useEffect } from 'react';
import { Check, X, Undo2 } from 'lucide-react';

interface ToastProps {
    id: string;
    message: string;
    type: 'success' | 'error';
    onUndo?: () => void;
    onDismiss: (id: string) => void;
    autoDismissMs?: number;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onUndo, onDismiss, autoDismissMs = 5000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, autoDismissMs);

        return () => clearTimeout(timer);
    }, [id, autoDismissMs, onDismiss]);

    return (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'
            } animate-slide-in`}>
            <div className="flex items-center gap-2">
                {type === 'success' ? (
                    <Check size={20} className="text-green-600" />
                ) : (
                    <X size={20} className="text-red-600" />
                )}
                <span className={`text-sm font-medium ${type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                    {message}
                </span>
            </div>
            <div className="flex items-center gap-2">
                {onUndo && (
                    <button
                        onClick={() => {
                            onUndo();
                            onDismiss(id);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                    >
                        <Undo2 size={14} />
                        Undo
                    </button>
                )}
                <button
                    onClick={() => onDismiss(id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

interface ToastContainerProps {
    toasts: Array<{
        id: string;
        message: string;
        type: 'success' | 'error';
        onUndo?: () => void;
    }>;
    onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onUndo={toast.onUndo}
                    onDismiss={onDismiss}
                />
            ))}
        </div>
    );
};

export default Toast;
