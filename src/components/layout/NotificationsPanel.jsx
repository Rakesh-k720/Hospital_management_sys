import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { Bell } from 'lucide-react';
import Button from '../ui/Button';

const NotificationsPanel = () => {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState({ notifications: [], unreadCount: 0 });

    const load = () => API.get('/notifications').then((res) => setData(res.data.data)).catch(() => {});

    useEffect(() => {
        load();
        const id = setInterval(load, 60000);
        return () => clearInterval(id);
    }, []);

    const markAll = async () => {
        await API.patch('/notifications/read-all');
        load();
    };

    return (
        <div className="relative">
            <Button variant="ghost" size="icon" className="relative" onClick={() => { setOpen(!open); load(); }}>
                <Bell size={20} />
                {data.unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {data.unreadCount}
                    </span>
                )}
            </Button>
            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-premium border z-50 max-h-96 overflow-y-auto">
                    <div className="flex justify-between items-center p-3 border-b">
                        <span className="font-bold text-sm">Notifications</span>
                        <button type="button" className="text-xs text-primary-600" onClick={markAll}>Mark all read</button>
                    </div>
                    {data.notifications.length === 0 ? (
                        <p className="p-4 text-xs text-secondary-400">No notifications</p>
                    ) : data.notifications.map((n) => (
                        <div key={n.id} className={`p-3 border-b text-xs ${n.is_read ? 'opacity-60' : 'bg-primary-50/30'}`}>
                            <p className="font-bold">{n.title}</p>
                            <p className="text-secondary-600 mt-1">{n.message}</p>
                            {n.link && <Link to={n.link} className="text-primary-600 mt-1 inline-block">View</Link>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationsPanel;
