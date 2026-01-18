import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { formatRupiah } from '../../lib/utils';
import { Users, Store, TrendingUp, Calendar, Activity, Shield } from 'lucide-react';

export default function AdminPage() {
    const { user } = useStore();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalStores: 0,
        activeToday: 0,
        newThisWeek: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [announcements, setAnnouncements] = useState([]);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info' });

    useEffect(() => {
        fetchUsers();
        fetchStats();
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        const { data } = await supabase
            .from('system_announcements')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setAnnouncements(data);
    };

    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('system_announcements')
                .insert([{
                    title: newAnnouncement.title,
                    message: newAnnouncement.message,
                    type: newAnnouncement.type,
                    created_by: user?.username || 'Admin',
                    is_active: true,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

            setNewAnnouncement({ title: '', message: '', type: 'info' });
            fetchAnnouncements();
            alert('Pengumuman berhasil dibuat!');
        } catch (error) {
            alert('Gagal membuat pengumuman: ' + error.message);
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!confirm('Hapus pengumuman ini?')) return;

        try {
            const { error } = await supabase
                .from('system_announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchAnnouncements();
        } catch (error) {
            alert('Gagal menghapus: ' + error.message);
        }
    };

    const handleToggleSuspend = async (userId, currentStatus) => {
        if (!confirm(currentStatus ? 'Aktifkan kembali user ini?' : 'Suspend user ini?')) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ is_suspended: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            // Optimistic update
            setUsers(users.map(u =>
                u.id === userId ? { ...u, is_suspended: !currentStatus } : u
            ));

            alert(`User berhasil di-${currentStatus ? 'aktifkan' : 'suspend'}`);
        } catch (error) {
            alert('Gagal mengubah status: ' + error.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Yakin ingin menghapus PERMANEN user ini? Data toko akan hilang!')) return;

        // Double confirmation for safety
        const confirmName = prompt('Ketik "DELETE" untuk konfirmasi penghapusan:');
        if (confirmName !== 'DELETE') return;

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.filter(u => u.id !== userId));
            alert('User berhasil dihapus');
        } catch (error) {
            alert('Gagal menghapus user: ' + error.message);
        }
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setUsers(data);
        }
        setIsLoading(false);
    };

    const fetchStats = async () => {
        // Total users
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        // Unique stores
        const { data: storesData } = await supabase
            .from('users')
            .select('store_id');
        const uniqueStores = new Set(storesData?.map(u => u.store_id) || []);

        // New users this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: newThisWeek } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo.toISOString());

        setStats({
            totalUsers: totalUsers || 0,
            totalStores: uniqueStores.size,
            activeToday: 0, // Could implement with last_login field
            newThisWeek: newThisWeek || 0
        });

        // Fetch Subscription Stats (Active Pro Users)
        const { count: proUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('plan_type', 'pro');

        setStats(prev => ({ ...prev, activePro: proUsers || 0 }));
    };

    const [transactions, setTransactions] = useState([]);
    useEffect(() => {
        const fetchTransactions = async () => {
            const { data } = await supabase
                .from('subscription_transactions')
                .select('*, users(username, store_id)')
                .order('created_at', { ascending: false })
                .limit(50);
            if (data) setTransactions(data);
        };
        fetchTransactions();
    }, []);

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.store_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!useStore.getState().isSuperAdmin()) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Access Denied
                    </h2>
                    <p className="text-slate-500">
                        Halaman ini hanya untuk Super Admin
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-7 h-7 text-primary" />
                        Admin Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Monitoring & Kontrol Sistem
                    </p>
                </div>
                <button
                    onClick={() => { fetchUsers(); fetchStats(); }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
                >
                    Refresh Data
                </button>
            </div>

            {/* Global Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Users</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalUsers}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Pendapatan App</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatRupiah(transactions.reduce((sum, t) => sum + (t.amount || 0), 0))}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-lg">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Pro Users</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activePro || 0}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Stores</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalStores}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Announcement Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Form */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Buat Pengumuman</h3>
                    <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Judul Pengumuman"
                            value={newAnnouncement.title}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                            required
                        />
                        <select
                            value={newAnnouncement.type}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                        >
                            <option value="info">Info (Biru)</option>
                            <option value="warning">Peringatan (Kuning)</option>
                            <option value="critical">Penting (Merah)</option>
                        </select>
                        <textarea
                            placeholder="Isi Pengumuman..."
                            value={newAnnouncement.message}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                            rows="3"
                            required
                        ></textarea>
                        <button className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90">
                            Kirim Pengumuman
                        </button>
                    </form>
                </div>

                {/* List Announcements */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Pengumuman Aktif</h3>
                    <div className="space-y-4">
                        {announcements.map(ann => (
                            <div key={ann.id} className="flex justify-between items-start p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${ann.type === 'critical' ? 'bg-red-100 text-red-700' :
                                            ann.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>{ann.type}</span>
                                        <h4 className="font-bold text-slate-900 dark:text-white">{ann.title}</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{ann.message}</p>
                                    <p className="text-xs text-slate-400 mt-2">Posted by {ann.created_by} on {new Date(ann.created_at).toLocaleDateString()}</p>
                                </div>
                                <button
                                    onClick={() => handleDeleteAnnouncement(ann.id)}
                                    className="text-red-500 hover:text-red-700 p-2"
                                >
                                    <Shield className="w-4 h-4" /> Hapus
                                </button>
                            </div>
                        ))}
                        {announcements.length === 0 && <p className="text-slate-500 text-center py-4">Tidak ada pengumuman aktif.</p>}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                    type="text"
                    placeholder="Cari username, nama, atau store ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        Daftar Users ({filteredUsers.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Username</th>
                                <th className="px-6 py-4 font-medium">Nama/Bisnis</th>
                                <th className="px-6 py-4 font-medium">Role</th>
                                <th className="px-6 py-4 font-medium">Store ID</th>
                                <th className="px-6 py-4 font-medium">Plan</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        Tidak ada data
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${u.is_suspended ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {u.username}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                            {u.name || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'owner'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-green-100 text-green-700'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            {u.store_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${u.plan_type === 'pro' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800'}`}>
                                                {u.plan_type?.toUpperCase() || 'FREE'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleSuspend(u.id, u.is_suspended)}
                                                    className={`px-3 py-1 text-xs font-bold rounded-lg border ${u.is_suspended
                                                        ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                                        : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                                                        }`}
                                                >
                                                    {u.is_suspended ? 'Aktifkan' : 'Suspend'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                                                    title="Hapus Permanen"
                                                >
                                                    <Shield className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
