import React, { useState, useEffect } from 'react';
import { IconCalendarEvent, IconClock, IconUser, IconStethoscope, IconLogout, IconCheck, IconCalendarPlus, IconX, IconWand } from '@tabler/icons-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StaffDashboard = () => {
    const [appointments, setAppointments] = useState([]);
    const [openSlots, setOpenSlots] = useState([]);
    const [selectedApt, setSelectedApt] = useState(null);
    const [showAddStaff, setShowAddStaff] = useState(false); // Used in Admin, removed from here
    
    // Add Slot Form State
    const [showAddSlot, setShowAddSlot] = useState(false);
    const [newSlot, setNewSlot] = useState({
        slotDate: '', startTime: '', endTime: ''
    });

    // Complete Appointment State
    const [diagnosis, setDiagnosis] = useState('');
    const [prescription, setPrescription] = useState('');
    const [notes, setNotes] = useState('');

    const { logout, user } = useAuth();
    
    // Quick duration helper
    const applyDuration = (minutes) => {
        if (!newSlot.startTime) {
            alert("Please select a start time first!");
            return;
        }
        const [hours, mins] = newSlot.startTime.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, mins + minutes);
        const endHours = String(date.getHours()).padStart(2, '0');
        const endMins = String(date.getMinutes()).padStart(2, '0');
        setNewSlot(prev => ({ ...prev, endTime: `${endHours}:${endMins}` }));
    };
    
    const loadData = async () => {
        try {
            const [aptRes, slotRes] = await Promise.all([
                api.post('/appointments/staff-appointments'),
                api.post('/appointments/staff-slots')
            ]);
            setAppointments(aptRes.data);
            setOpenSlots(slotRes.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    };

    useEffect(() => {
        loadData();
    }, [user.userId]);

    const handleComplete = async (e) => {
        e.preventDefault();
        try {
            await api.post('/records/add', {
                studentId: selectedApt.student_id, // we need student_id from appointment query
                staffId: selectedApt.staff_id,     // and staff_id
                appointmentId: selectedApt.appointment_id,
                diagnosis,
                prescription,
                notes
            });
            alert("Appointment completed and medical record saved!");
            setSelectedApt(null);
            setDiagnosis('');
            setPrescription('');
            setNotes('');
            
            // Refetch
            await loadData();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save record");
        }
    };

    const handleAddSlot = async (e) => {
        e.preventDefault();
        try {
            await api.post('/appointments/slots/add', newSlot);
            alert("Time slot successfully added!");
            setShowAddSlot(false);
            setNewSlot({ slotDate: '', startTime: '', endTime: '' });
            await loadData();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to add time slot");
        }
    };

    const handleCancel = async (aptId) => {
        if (!window.confirm("Are you sure you want to cancel this appointment and mark yourself as busy?")) return;
        
        try {
            await api.put(`/appointments/${aptId}/cancel-by-staff`);
            alert("Appointment cancelled and student notified.");
            // Refetch
            await loadData();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to cancel appointment");
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 border-b border-slate-200 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 md:p-3 bg-blue-100 text-blue-600 rounded-2xl">
                        <IconStethoscope size={24} className="md:w-[28px] md:h-[28px]" stroke={1.5} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-800">Clinic Staff</h1>
                        <p className="text-xs md:text-sm text-slate-500 font-medium">Provider Portal</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 w-full sm:w-auto justify-center sm:justify-start">
                    <IconUser size={20} className="text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">Staff Portal</span>
                    <button 
                        onClick={logout}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Log out"
                    >
                        <IconLogout size={20} />
                    </button>
                </div>
            </header>

            <div className="flex justify-end">
                <button 
                    onClick={() => setShowAddSlot(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-xl shadow-sm transition-colors"
                >
                    + Manage Availability
                </button>
            </div>

            <main className="grid grid-cols-1 gap-8">
                <section className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-lg md:text-xl font-semibold mb-6 flex items-center gap-2">
                        <IconCalendarEvent className="text-blue-500" />
                        My Upcoming Appointments
                    </h2>
                    
                    {!Array.isArray(appointments) || appointments.length === 0 ? (
                        <p className="text-slate-500">No appointments scheduled.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                        <th className="pb-3 font-semibold">Date & Time</th>
                                        <th className="pb-3 font-semibold">Student Name</th>
                                        <th className="pb-3 font-semibold">Reason</th>
                                        <th className="pb-3 font-semibold">Status</th>
                                        <th className="pb-3 font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map((apt) => (
                                        <tr key={apt.appointment_id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-4">
                                                <div className="font-semibold text-slate-800">{new Date(apt.slot_date).toLocaleDateString()}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                    <IconClock size={12} /> {apt.start_time} - {apt.end_time}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="font-medium text-slate-800">{apt.student_first_name} {apt.student_last_name}</div>
                                                <div className="text-xs text-slate-500">ID: {apt.student_number}</div>
                                            </td>
                                            <td className="py-4 text-sm text-slate-600">{apt.reason}</td>
                                            <td className="py-4">
                                                <span className={`text-xs px-2 py-1 rounded-md font-semibold ${
                                                    apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {apt.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    {apt.status === 'pending' && (
                                                        <button 
                                                            onClick={() => setSelectedApt(apt)}
                                                            className="flex items-center gap-1 text-sm bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                                                        >
                                                            <IconCheck size={16} /> Complete
                                                        </button>
                                                    )}
                                                    {apt.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleCancel(apt.appointment_id)}
                                                            className="flex items-center gap-1 text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                                                            title="Mark as busy and notify student"
                                                        >
                                                            Cancel (Busy)
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100 mt-2">
                    <h2 className="text-lg md:text-xl font-semibold mb-6 flex items-center gap-2">
                        <IconCalendarEvent className="text-green-500" />
                        My Open Availability
                    </h2>
                    
                    {!Array.isArray(openSlots) || openSlots.length === 0 ? (
                        <p className="text-slate-500">You don't have any open slots right now.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {openSlots.map((slot) => (
                                <div key={slot.slot_id} className="bg-green-50 border border-green-100 p-4 rounded-2xl flex flex-col items-start gap-1">
                                    <span className="text-sm font-bold text-green-800">
                                        {new Date(slot.slot_date).toLocaleDateString()}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-100/50 px-2 py-1 rounded-md mt-1">
                                        <IconClock size={14} /> {slot.start_time} - {slot.end_time}
                                    </div>
                                    <span className="text-xs text-green-600 mt-2 font-medium">Available to book</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Completion Modal */}
            {selectedApt && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-xl">
                        <h2 className="text-xl font-semibold mb-2">Complete Appointment</h2>
                        <p className="text-sm text-slate-500 mb-6">Enter medical notes for {selectedApt.student_first_name} {selectedApt.student_last_name}</p>
                        
                        <form onSubmit={handleComplete} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis *</label>
                                <input 
                                    required 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none" 
                                    value={diagnosis} onChange={e => setDiagnosis(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prescription</label>
                                <input 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none" 
                                    value={prescription} onChange={e => setPrescription(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                                <textarea 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none h-24 resize-none" 
                                    value={notes} onChange={e => setNotes(e.target.value)} 
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setSelectedApt(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                                    Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Slot Modal - Enhanced Premium UI */}
            {showAddSlot && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 transform transition-all">
                        
                        {/* Modal Header */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative">
                            <button 
                                onClick={() => setShowAddSlot(false)}
                                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <IconX size={20} />
                            </button>
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                                <IconCalendarPlus size={28} className="text-white drop-shadow-md" />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight">Create Availability</h2>
                            <p className="text-blue-100 text-sm mt-1 opacity-90">Open up your schedule for students</p>
                        </div>
                        
                        {/* Modal Body */}
                        <form onSubmit={handleAddSlot} className="p-8 flex flex-col gap-6">
                            
                            {/* Date Picker */}
                            <div className="group">
                                <label className="block text-sm font-semibold text-slate-700 mb-2 transition-colors group-focus-within:text-blue-600">
                                    Slot Date
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <IconCalendarEvent size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input 
                                        required 
                                        type="date" 
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
                                        value={newSlot.slotDate} 
                                        onChange={e => setNewSlot({...newSlot, slotDate: e.target.value})} 
                                    />
                                </div>
                            </div>
                            
                            {/* Time Pickers */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 transition-colors group-focus-within:text-blue-600">Start Time</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <IconClock size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        </div>
                                        <input 
                                            required 
                                            type="time" 
                                            className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
                                            value={newSlot.startTime} 
                                            onChange={e => setNewSlot({...newSlot, startTime: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 transition-colors group-focus-within:text-blue-600">End Time</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <IconClock size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        </div>
                                        <input 
                                            required 
                                            type="time" 
                                            className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
                                            value={newSlot.endTime} 
                                            onChange={e => setNewSlot({...newSlot, endTime: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Magic Duration Chips */}
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                                <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                                    <IconWand size={14} /> Quick Duration
                                </div>
                                <div className="flex gap-2">
                                    {[15, 30, 45, 60].map((mins) => (
                                        <button
                                            key={mins}
                                            type="button"
                                            onClick={() => applyDuration(mins)}
                                            className="flex-1 py-2 px-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                                        >
                                            {mins}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowAddSlot(false)} 
                                    className="flex-1 py-3.5 px-4 text-slate-700 font-semibold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30"
                                >
                                    Publish Slot
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffDashboard;
