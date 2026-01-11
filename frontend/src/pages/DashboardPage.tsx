import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, FileText, CheckCircle, Clock, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { invoicesAPI } from '../services/api';
import { fetchUserConfig } from '../services/config';

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch user config on mount (loads column mappings and other settings)
    useEffect(() => {
        fetchUserConfig().catch(err => {
            console.error('Failed to load user config:', err);
            // Non-blocking: dashboard will still work with default mappings
        });
    }, []);

    // Handle ESC key to exit fullscreen
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        // Lock body scroll when fullscreen
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isFullscreen]);

    // Fetch stats from API with auto-refresh every 30 seconds
    const { data: statsData, isLoading, isError, refetch } = useQuery({
        queryKey: ['invoiceStats'],
        queryFn: invoicesAPI.getStats,
        refetchInterval: 30000, // Auto-refresh every 30 seconds
        staleTime: 10000,
    });

    // Handle manual refresh of dashboard and stats
    const handleRefresh = async () => {
        setIsRefreshing(true);

        // Refetch stats
        await refetch();

        // Force reload iframe by changing the key
        setRefreshKey(prev => prev + 1);

        // Reset refreshing state after animation
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1000);
    };

    const stats = [
        {
            label: 'Total Invoices',
            value: isLoading ? '—' : (statsData?.total_invoices || 0).toString(),
            icon: FileText,
            color: 'bg-blue-50 text-blue-600',
        },
        {
            label: 'Verified',
            value: isLoading ? '—' : (statsData?.verified || 0).toString(),
            icon: CheckCircle,
            color: 'bg-green-50 text-green-600',
        },
        {
            label: 'Pending Review',
            value: isLoading ? '—' : (statsData?.pending_review || 0).toString(),
            icon: Clock,
            color: 'bg-yellow-50 text-yellow-600',
        },
        {
            label: 'This Month',
            value: isLoading ? '—' : (statsData?.this_month || 0).toString(),
            // Use neutral icon when value is 0, otherwise show growth icon
            icon: (statsData?.this_month || 0) === 0 ? FileText : TrendingUp,
            color: 'bg-purple-50 text-purple-600',
        },
    ];

    return (
        <div className="space-y-6">
            {isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">Failed to load statistics. Please refresh the page.</p>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                                    <p className={`text-3xl font-bold mt-2 ${isLoading ? 'text-gray-400 animate-pulse' : 'text-gray-900'}`}>
                                        {stat.value}
                                    </p>
                                </div>
                                <div className={`${stat.color} p-3 rounded-lg`}>
                                    <Icon size={24} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Dashboard Preview - Live Embedded Dashboard with Fullscreen */}
            {user?.dashboard_url && (
                <div
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
                        }`}
                >
                    <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-white">
                        <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
                                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                            >
                                {isFullscreen ? (
                                    <>
                                        <Minimize2 className="mr-2" size={16} />
                                        Exit Fullscreen
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 className="mr-2" size={16} />
                                        Fullscreen
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Refresh dashboard data"
                            >
                                <RefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} size={16} />
                                Refresh
                            </button>
                            <a
                                href={user.dashboard_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
                            >
                                <TrendingUp className="mr-2" size={16} />
                                Open in New Tab
                            </a>
                        </div>
                    </div>
                    <div className={`${isFullscreen ? 'p-4 h-[calc(100vh-8rem)]' : 'p-4'}`}>
                        {/* Live Embedded Dashboard */}
                        <div
                            className="relative w-full rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-gray-50 transition-all duration-300"
                            style={{ height: isFullscreen ? '100%' : '1350px' }}
                        >
                            <iframe
                                key={refreshKey}
                                src={`${user.dashboard_url.includes('lookerstudio.google.com') && !user.dashboard_url.includes('/embed/')
                                    ? user.dashboard_url.replace('/reporting/', '/embed/reporting/')
                                    : user.dashboard_url
                                    }${user.dashboard_url.includes('?') ? '&' : '?'}refresh=${refreshKey}`}
                                className="absolute top-0 left-0 w-full h-full"
                                frameBorder="0"
                                style={{ border: 0 }}
                                allowFullScreen
                                sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                                title="Analytics Dashboard Preview"
                            />
                        </div>
                        {!isFullscreen && (
                            <p className="text-center text-sm text-gray-500 mt-3">
                                Interact with the dashboard above • Click Refresh to update data after edits • Use fullscreen for better viewing
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Overlay backdrop when fullscreen */}
            {isFullscreen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
                    onClick={() => setIsFullscreen(false)}
                />
            )}
        </div>
    );
};

export default DashboardPage;
