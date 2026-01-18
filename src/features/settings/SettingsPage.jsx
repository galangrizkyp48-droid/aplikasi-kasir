import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
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

    const [employees, setEmployees] = useState([]);

    const fetchEmployees = async () => {
        if (!user?.storeId) return;
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('store_id', user.storeId)
            .neq('id', user.id);

        if (error) {
            console.error('Error fetching employees:', error);
        } else {
            setEmployees(data || []);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, [user?.storeId]);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!newEmployee.username || !newEmployee.password || !newEmployee.name) {
            alert('Mohon isi semua field!');
            return;
        }

        if (!user?.storeId) {
            alert('Error: User tidak memiliki storeId.');
            return;
        }

        try {
            // Check username uniqueness in Supabase
            const { data: existing } = await supabase
                .from('users')
                .select('username')
                .eq('username', newEmployee.username);

            if (existing && existing.length > 0) {
                alert('Username sudah digunakan!');
                return;
            }

            const { error } = await supabase.from('users').insert([{
                name: newEmployee.name,
                username: newEmployee.username,
                password: newEmployee.password,
                role: newEmployee.role,
                store_id: user.storeId,
                pin: '123456'
            }]);

            if (error) throw error;

            setNewEmployee({ name: '', username: '', password: '', role: 'cashier' });
            alert('Karyawan berhasil ditambahkan!');
            fetchEmployees();
        } catch (error) {
            alert('Gagal menambahkan karyawan: ' + error.message);
        }
    };

    useEffect(() => {
        const loadSettings = async () => {
            if (!user?.storeId) return;
            const { data } = await supabase
                .from('settings')
                .select('*')
                .eq('store_id', user.storeId);

            if (data) {
                const loaded = {};
                data.forEach(item => {
                    loaded[item.key] = item.value;
                });
                if (loaded.taxRate !== undefined) loaded.taxRate = Number(loaded.taxRate);
                setSettings(prev => ({ ...prev, ...loaded }));
            }
        };
        loadSettings();
    }, [user?.storeId]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const upsertData = Object.entries(settings).map(([key, value]) => ({
                store_id: user.storeId,
                key,
                value: String(value)
            }));

            const { error } = await supabase
                .from('settings')
                .upsert(upsertData, { onConflict: 'store_id,key' });

            if (error) throw error;
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

                            {user?.plan_type === 'free' ? (
                                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white text-center">
                                    <div className="flex justify-center mb-3">
                                        <div className="p-3 bg-white/10 rounded-full">
                                            <Users className="w-6 h-6 text-yellow-400" />
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">Upgrade ke PRO</h3>
                                    <p className="text-slate-300 text-sm mb-4">
                                        Paket Free hanya untuk 1 user (Owner).<br />
                                        Upgrade untuk menambahkan karyawan unlimited.
                                    </p>
                                    <a
                                        href="/subscription"
                                        className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg transition-colors"
                                    >
                                        Lihat Paket
                                    </a>
                                </div>
                            ) : (
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
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
