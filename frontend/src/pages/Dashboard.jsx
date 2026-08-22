import React, { useState, useEffect } from 'react';
import { IconCalendarEvent, IconClock, IconUser, IconStethoscope, IconLogout, IconSettings, IconBell, IconX } from '@tabler/icons-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const [slots, setSlots] = useState([]);
    const [records, setRecords] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [contactNumber, setContactNumber] = useState('');
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [profile, setProfile] = useState(null);
    const { logout, user } = useAuth();
    
    const fetchSlots = async () => {
        try {
            const response = await api.get('/appointments/slots');
            setSlots(response.data);
        } catch (error) {
            console.error("Failed to fetch slots:", error);
        }
    };

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                // In a real app we'd fetch the studentId from the user object properly
                // Since our JWT has userId, we need to fetch records using the student id, 
                // but for simplicity our backend is using studentId. Let's send the userId and let backend handle it, 
                // OR we can update the backend to query by userId instead of studentId.
                // Wait, recordController.js `getStudentRecords` queries by student_id. 
                // Let's modify the backend to lookup by user_id instead, or do it here.
                // Let's just fetch it, and I'll modify the backend route slightly.
                const response = await api.get(`/records/student/${user.userId}`);
                setRecords(response.data);
            } catch (error) {
                console.error("Failed to fetch records:", error);
            }
        };

        const fetchNotifications = async () => {
            try {
                const response = await api.get(`/notifications/me`);
                setNotifications(response.data);
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };

        const fetchProfile = async () => {
            try {
                const response = await api.get(`/students/me`);
                setProfile(response.data);
                setContactNumber(response.data.contact_number || '');
            } catch (error) {
                console.error("Failed to fetch profile");
            }
        };

        fetchSlots();
        if (user?.role === 'student') {
            fetchRecords();
            fetchNotifications();
            fetchProfile();
            
            // Poll for notifications every 5 seconds
            const interval = setInterval(fetchNotifications, 5000);
            return () => clearInterval(interval);
        }
    }, [user?.role, user?.userId]);

    const handleBookSlot = async (slotId) => {
        const reason = window.prompt("Please enter the reason for your visit:");
        if (!reason) return; // User cancelled

        try {
            await api.post('/appointments/book', {
                slotId,
                reason
            });
            alert("Appointment booked successfully!");
            fetchSlots(); // refresh list
        } catch (error) {
            alert(error.response?.data?.message || "Failed to book appointment");
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/students/me`, { contactNumber });
            
            if (profilePictureFile) {
                setUploadingPic(true);
                const formData = new FormData();
                formData.append('profilePicture', profilePictureFile);
                await api.post('/upload/profile-picture', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setUploadingPic(false);
            }

            alert("Profile updated successfully!");
            setShowSettings(false);
            window.location.reload(); // Reload to fetch new picture
        } catch (error) {
            console.error("Failed to update profile:", error);
            setUploadingPic(false);
            alert("Failed to update profile");
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleMarkAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.notification_id === id ? {...n, is_read: true} : n));
        } catch (error) {
            console.error("Failed to mark as read");
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 border-b border-slate-200 gap-4 relative">
                <div className="flex items-center gap-6 p-6">
                    <div className="relative h-20 w-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm border border-blue-200 overflow-hidden">
                        {profile?.profile_picture_url ? (
                            <img src={profile.profile_picture_url} alt="Profile" className="object-cover h-full w-full" />
                        ) : (
                            <IconUser size={40} stroke={1.5} />
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                            Welcome back, {profile?.first_name || 'Student'}! 👋
                        </h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <span className="bg-slate-100 px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-200">
                                ID: {profile?.student_number}
                            </span>
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 w-full sm:w-auto justify-center sm:justify-start">
                    <IconUser size={20} className="text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">
                        {user?.role === 'staff' ? 'Staff Portal' : 'Student Portal'}
                    </span>
                    
                    <div className="relative">
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors relative"
                            title="Notifications"
                        >
                            <IconBell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
                            )}
                        </button>
                        
                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                <div className="p-4 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-800">Notifications</h3>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-slate-500 text-sm">No notifications</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div 
                                                key={n.notification_id} 
                                                onClick={() => !n.is_read && handleMarkAsRead(n.notification_id)}
                                                className={`p-4 border-b border-slate-50 cursor-pointer transition-colors ${n.is_read ? 'opacity-60' : 'bg-blue-50/50 hover:bg-blue-50'}`}
                                            >
                                                <p className="text-sm text-slate-700">{n.message}</p>
                                                <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setShowSettings(true)}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                        title="Settings"
                    >
                        <IconSettings size={20} />
                    </button>
                    <button 
                        onClick={logout}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Log out"
                    >
                        <IconLogout size={20} />
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column - Booking Section */}
                <section className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                        <h2 className="text-lg md:text-xl font-semibold mb-6 flex items-center gap-2">
                            <IconCalendarEvent className="text-blue-500" />
                            Book an Appointment
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {!Array.isArray(slots) || slots.length === 0 ? (
                                <p className="text-slate-500">No available slots at the moment.</p>
                            ) : slots.map((slot) => (
                                <button 
                                    key={slot.slot_id} 
                                    onClick={() => handleBookSlot(slot.slot_id)}
                                    className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all group bg-slate-50 hover:bg-white flex justify-between items-center text-left w-full"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-800 mb-1">{new Date(slot.slot_date).toLocaleDateString()}</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-blue-600 transition-colors">
                                            <IconClock size={16} />
                                            <span>{slot.start_time} - {slot.end_time}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                            {slot.staff_first_name} {slot.staff_last_name}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Right Column - Status/Info Section */}
                <aside className="w-full lg:w-80 flex flex-col gap-6">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex-1 min-h-[300px]">
                        <IconStethoscope size={120} className="absolute -bottom-6 -right-6 text-blue-500 opacity-20 rotate-12" />
                        <h2 className="text-xl font-semibold mb-4 relative z-10">Medical History</h2>
                        
                        <div className="relative z-10 flex flex-col gap-4 mt-6">
                            {!Array.isArray(records) || records.length === 0 ? (
                                <div className="text-blue-100 text-sm">
                                    <p className="mb-2">No medical records found.</p>
                                    <p>Your appointment history and doctor's notes will appear here.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                    {records.map(record => (
                                        <div key={record.record_id} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                                            <p className="text-xs text-blue-200 font-medium mb-1">
                                                {new Date(record.slot_date).toLocaleDateString()} • Dr. {record.staff_last_name}
                                            </p>
                                            <h3 className="font-semibold text-lg mb-2">{record.diagnosis}</h3>
                                            
                                            {record.prescription && (
                                                <div className="mb-2">
                                                    <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold mb-0.5">Prescription</p>
                                                    <p className="text-sm bg-white/10 rounded-lg px-2 py-1 inline-block">{record.prescription}</p>
                                                </div>
                                            )}
                                            
                                            {record.notes && (
                                                <div>
                                                    <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold mb-0.5">Notes</p>
                                                    <p className="text-sm text-blue-50 leading-relaxed">{record.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
                
            </main>

            {/* Settings Modal - Enhanced Profile View */}
            {showSettings && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-800">My Profile</h2>
                            <button onClick={() => setShowSettings(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <IconX size={20} />
                            </button>
                        </div>
                        
                        {profile ? (
                            <div className="space-y-6">
                                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-500">Full Name</span>
                                        <span className="text-sm font-bold text-slate-800">{profile.first_name} {profile.last_name}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-500">Student ID</span>
                                        <span className="text-sm font-bold text-slate-800">{profile.student_number}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-500">Email Address</span>
                                        <span className="text-sm font-bold text-slate-800">{profile.email}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-500">Date of Birth</span>
                                        <span className="text-sm font-bold text-slate-800">{new Date(profile.dob).toLocaleDateString()}</span>
                                    </div>
                                </div>

                              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5 p-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                                    <input 
                                        type="tel" 
                                        required
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={contactNumber}
                                        onChange={(e) => setContactNumber(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Profile Picture (AWS S3 Upload)</label>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                                        onChange={(e) => setProfilePictureFile(e.target.files[0])}
                                    />
                                </div>
                                <div className="flex gap-3 mt-2">
                                    <button type="button" onClick={() => setShowSettings(false)} className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={uploadingPic} className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                                        {uploadingPic ? 'Uploading...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form></div>
                        ) : (
                            <div className="py-8 flex justify-center">
                                <p className="text-slate-500 text-sm font-medium animate-pulse">Loading profile data...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
