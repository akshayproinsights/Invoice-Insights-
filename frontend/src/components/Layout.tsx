import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    Upload,
    ClipboardCheck,
    IndianRupee,
    CheckCircle,
    LogOut,
    Menu,
    X
} from 'lucide-react';

const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const navigation = [
        { name: 'Overview', path: '/', icon: LayoutDashboard },
        { name: 'Upload & Process', path: '/upload', icon: Upload },
        { name: 'Review Dates', path: '/review/dates', icon: ClipboardCheck },
        { name: 'Review Amounts', path: '/review/amounts', icon: IndianRupee },
        { name: 'Verified Invoices', path: '/verified', icon: CheckCircle },
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-20'
                    } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
            >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    {isSidebarOpen && (
                        <h1 className="text-xl font-bold text-gray-900">Invoice Hub</h1>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center ${isSidebarOpen ? 'px-4' : 'px-2 justify-center'
                                    } py-3 rounded-lg transition ${isActive
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                title={item.name}
                            >
                                <Icon size={20} className="flex-shrink-0" />
                                {isSidebarOpen && <span className="ml-3">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-gray-200">
                    {isSidebarOpen ? (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                            <button
                                onClick={logout}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                                <LogOut size={16} className="mr-2" />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={logout}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition w-full flex justify-center"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {getGreeting()}, {user?.username}!
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Manage your invoice processing workflow
                            </p>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
