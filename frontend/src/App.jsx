import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import CustomerModal from './components/CustomerModal';
import PauseModal from './components/PauseModal';
import BillModal from './components/BillModal';
import CustomerDetailModal from './components/CustomerDetailModal';

function MainApp() {
  const { user } = useAuth();

  // Auth modal state
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  // Customer modal state (Add / Edit)
  const [custModalOpen, setCustModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);

  // Pause modal state
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [selectedForPause, setSelectedForPause] = useState(null);

  // Bill modal state
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [selectedForBill, setSelectedForBill] = useState(null);

  // Customer Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Dashboard reload key
  const [reloadKey, setReloadKey] = useState(0);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const handleOpenLogin = () => {
    setAuthMode('login');
    setAuthOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthMode('register');
    setAuthOpen(true);
  };

  const handleAddCustomer = () => {
    setCustomerToEdit(null);
    setCustModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setCustomerToEdit(customer);
    setCustModalOpen(true);
  };

  const handlePauseCustomer = (customer) => {
    setSelectedForPause(customer);
    setPauseModalOpen(true);
  };

  const handleViewBill = (customer) => {
    setSelectedForBill(customer);
    setBillModalOpen(true);
  };

  const handleViewDetails = (customerId) => {
    setSelectedCustomerId(customerId);
    setDetailModalOpen(true);
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        onLogin={handleOpenLogin}
        onRegister={handleOpenRegister}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 999,
            maxWidth: '400px'
          }}
        >
          <div className={`alert alert-${toast.type}`} style={{ boxShadow: 'var(--shadow-lg)' }}>
            {toast.type === 'success' ? '✅ ' : '❌ '} {toast.message}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {user ? (
          <Dashboard
            key={reloadKey}
            onAddCustomer={handleAddCustomer}
            onEditCustomer={handleEditCustomer}
            onPauseCustomer={handlePauseCustomer}
            onViewBill={handleViewBill}
            onViewDetails={handleViewDetails}
            showToast={showToast}
          />
        ) : (
          <LandingPage onGetStarted={handleOpenRegister} />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />

      {/* Customer Add/Edit Modal */}
      <CustomerModal
        isOpen={custModalOpen}
        onClose={() => setCustModalOpen(false)}
        customerToEdit={customerToEdit}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          setReloadKey((k) => k + 1);
        }}
      />

      {/* Pause Modal */}
      <PauseModal
        isOpen={pauseModalOpen}
        onClose={() => setPauseModalOpen(false)}
        customer={selectedForPause}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          setReloadKey((k) => k + 1);
        }}
      />

      {/* Bill Modal */}
      <BillModal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        customer={selectedForBill}
      />

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        customerId={selectedCustomerId}
        onPause={handlePauseCustomer}
        onResume={(cust) => {
          // Trigger resume directly
          setReloadKey((k) => k + 1);
        }}
        onBill={handleViewBill}
        onEdit={handleEditCustomer}
        onDelete={(cust) => {
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
