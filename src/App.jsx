import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect } from 'react';
import { useStore } from './lib/store';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import DashboardLayout from './components/layout/DashboardLayout';
import POSPage from './features/pos/POSPage';
import OrdersPage from './features/orders/OrdersPage';
import ProductListPage from './features/inventory/ProductListPage';
import ReportsPage from './features/reports/ReportsPage';
import ProductFormPage from './features/inventory/ProductFormPage';
import SettingsPage from './features/settings/SettingsPage';
import ShoppingListPage from './features/shopping-list/ShoppingListPage';
import ExpensesPage from './features/expenses/ExpensesPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const user = useStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const { updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for updates every 15 seconds (Aggressive for demo purposes)
        setInterval(() => {
          r.update();
        }, 15000);
      }
    }
  });

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/shopping-list" element={<ShoppingListPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id" element={<ProductFormPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
