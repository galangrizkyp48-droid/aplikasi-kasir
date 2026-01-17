import { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { useStore } from '../../lib/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, Store, Receipt, Users } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useStore();
    const [settings, setSettings] = useState({
        storeName: '',
        storeAddress: '',
        storePhone: '',
        receiptFooter: '',
        printReceipt: true,
        taxRate: 11
    });

    const [newEmployee, setNewEmployee] = useState({
        name: '',
        username: '',
        password: '',
        role: 'cashier'
    });

    // Fetch Employees (excluding self and strictly by storeId)
    const employees = useLiveQuery(async () => {
        if (!user?.storeId) return [];
        return await db.users
            .where('storeId')
            .equals(user.storeId)
            .filter(u => u.id !== user.id)
            .toArray();
    }, [user?.storeId]);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!newEmployee.username || !newEmployee.password || !newEmployee.name) {
            alert('Mohon isi semua field!');
            return;
        }

        // Check if user has storeId
        if (!user?.storeId) {
            alert('Error: User tidak memiliki storeId. Silakan logout dan login ulang dengan admin/admin atau daftar akun baru.');
            return;
        }

        try {
            // Check username uniqueness
            try {
                const existing = await db.users.where('username').equals(newEmployee.username).count();
                if (existing > 0) {
                    alert('Username sudah digunakan!');
                    return;
                }
            } catch (queryError) {
                console.warn('Database query error, skipping duplicate check:', queryError);
                // Continue anyway - will fail on add if duplicate
            }

            // Add employee
            await db.users.add({
                name: newEmployee.name,
                username: newEmployee.username,
                password: newEmployee.password,
                role: newEmployee.role,
                storeId: user.storeId,
                pin: '123456' // Default PIN
            });

            setNewEmployee({ name: '', username: '', password: '', role: 'cashier' });
            alert('Karyawan berhasil ditambahkan! Username: ' + newEmployee.username);
        } catch (error) {
            console.error('Add employee error:', error);

            if (error.name === 'ConstraintError') {
                alert('Username sudah digunakan!');
            } else if (error.message && error.message.includes('storeId')) {
                alert('Error database: Schema lama terdeteksi.\n\nSolusi:\n1. Clear browser data (F12 → Application → Clear storage)\n2. Refresh halaman\n3. Login dengan admin/admin\n4. Coba tambah karyawan lagi');
            } else {
                alert('Gagal menambahkan karyawan: ' + error.message + '\n\nTip: Coba clear browser data atau daftar akun bisnis baru.');
            }
        }
    };

    useEffect(() => {
        const loadSettings = async () => {
            const keys = ['storeName', 'storeAddress', 'storePhone', 'receiptFooter', 'printReceipt', 'taxRate'];
            const loaded = {};

            if (user?.storeId) {
                for (const key of keys) {
                    const item = await db.settings.where('[storeId+key]').equals([user.storeId, key]).first();
                    if (item) loaded[key] = item.value;
                }
                if (loaded.taxRate !== undefined) loaded.taxRate = Number(loaded.taxRate);
                setSettings(prev => ({ ...prev, ...loaded }));
            }
        };
        loadSettings();
    }, [user?.storeId]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await db.transaction('rw', db.settings, async () => {
                for (const [key, value] of Object.entries(settings)) {
                    const existing = await db.settings.where('[storeId+key]').equals([user.storeId, key]).first();
                    if (existing) {
                        await db.settings.update(existing.id, { value });
                    } else {
                        await db.settings.add({ key, value, storeId: user.storeId });
                    }
                }
            });
            alert('Pengaturan berhasil disimpan!');
        } catch (error) {
            alert('Gagal menyimpan pengaturan: ' + error.message);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengaturan Toko</h1>
                <p className="text-slate-500 dark:text-slate-400">Atur profil toko dan preferensi aplikasi</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Store Profile Section */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-slate-900 dark:text-white">Profil Toko</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Toko</label>
                            <input
                                type="text"
                                value={settings.storeName}
                                onChange={e => handleChange('storeName', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="Contoh: Kopi Senja"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nomor Telepon</label>
                                <input
                                    type="text"
                                    value={settings.storePhone}
                                    onChange={e => handleChange('storePhone', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="0812..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Alamat</label>
                                <input
                                    type="text"
                                    value={settings.storeAddress}
                                    onChange={e => handleChange('storeAddress', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Jalan..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Receipt Settings */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-slate-900 dark:text-white">Pengaturan Struk</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Catatan Kaki (Footer)</label>
                            <textarea
                                rows="2"
                                value={settings.receiptFooter}
                                onChange={e => handleChange('receiptFooter', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="Terima kasih atas kunjungan Anda!"
                            ></textarea>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pajak PPN (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.taxRate}
                                onChange={e => handleChange('taxRate', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                            />
                            <p className="text-xs text-slate-500">Masukkan 0 untuk menonaktifkan pajak.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                id="printReceipt"
                                type="checkbox"
                                checked={settings.printReceipt}
                                onChange={e => handleChange('printReceipt', e.target.checked)}
                                className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary"
                            />
                            <label htmlFor="printReceipt" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Otomatis cetak struk setelah pembayaran
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/25 active:scale-[0.98]"
                    >
                        <Save className="w-5 h-5" />
                        Simpan Pengaturan
                    </button>
                </div>
            </form>

            {/* Employee Management Section (Owner Only) */}
            {user?.role === 'owner' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-slate-900 dark:text-white">Manajemen Karyawan</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* List Employees */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Daftar Karyawan</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {employees?.map(emp => (
                                    <div key={emp.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{emp.name}</p>
                                            <p className="text-xs text-slate-500">@{emp.username} • {emp.role}</p>
                                        </div>
                                    </div>
                                ))}
                                {employees?.length === 0 && (
                                    <p className="text-sm text-slate-400 col-span-full">Belum ada karyawan.</p>
                                )}
                            </div>
                        </div>

                        {/* Add Employee Form */}
                        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                            <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-4">Tambah Karyawan Baru</h4>
                            <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    placeholder="Nama Lengkap"
                                    value={newEmployee.name}
                                    onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                                    className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    required
                                />
                                <input
                                    placeholder="Username Login"
                                    value={newEmployee.username}
                                    onChange={e => setNewEmployee({ ...newEmployee, username: e.target.value })}
                                    className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={newEmployee.password}
                                    onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
                                    className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    required
                                />
                                <select
                                    value={newEmployee.role}
                                    onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}
                                    className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                >
                                    <option value="cashier">Kasir</option>
                                    <option value="kitchen">Dapur</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <div className="md:col-span-2 flex justify-end">
                                    <button
                                        type="submit"
                                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                                    >
                                        + Tambah Akun
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
