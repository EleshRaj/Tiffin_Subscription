import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import CustomerModal from './components/CustomerModal';
import PauseModal from './components/PauseModal';
import BillModal from './components/BillModal';
import CustomerDetailModal from './components/CustomerDetailModal';
import TransferModal from './components/TransferModal';
import ImportModal from './components/ImportModal';
import OutboxModal from './components/OutboxModal';

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

  // T6: Transfer modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [customerToTransfer, setCustomerToTransfer] = useState(null);

  // T4: Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);

  // T1: Outbox modal state & Clock state
  const [outboxModalOpen, setOutboxModalOpen] = useState(false);
  const [simDate, setSimDate] = useState('2026-09-17');

  // Dashboard reload key
  const [reloadKey, setReloadKey] = useState(0);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Fetch initial simulated clock
  useEffect(() => {
    async function loadClock() {
      try {
        const res = await fetch('http://localhost:5000/clock');
        const data = await res.json();
        if (res.ok && data.currentDate) {
          setSimDate(data.currentDate);
        }
      } catch (e) {
        console.error('Failed to load simulated clock:', e);
      }
    }
    loadClock();
  }, []);

  // Advance clock handler (POST /clock)
  const handleAdvanceClock = async () => {
    try {
      const res = await fetch('http://localhost:5000/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // advance by 1 day
      });
      const data = await res.json();
      if (res.ok) {
        setSimDate(data.currentDate);
        showToast(
          data.isWeekday
            ? `🕒 Advanced to ${data.currentDate}: ${data.generatedEvents} delivery notifications generated!`
            : `🕒 Advanced to ${data.currentDate} (Weekend — No deliveries scheduled).`,
          'success'
        );
        setReloadKey((k) => k + 1);
      }
    } catch (e) {
      showToast('Failed to advance clock simulation.', 'error');
    }
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

  const handleTransferCustomer = (customer) => {
    setCustomerToTransfer(customer);
    setTransferModalOpen(true);
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
        simDate={simDate}
        onAdvanceClock={handleAdvanceClock}
        onOpenOutbox={() => setOutboxModalOpen(true)}
        onOpenImport={() => setImportModalOpen(true)}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 999,
            maxWidth: '450px'
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
            onTransferCustomer={handleTransferCustomer}
            onViewBill={handleViewBill}
            onViewDetails={handleViewDetails}
            onOpenImport={() => setImportModalOpen(true)}
            simDate={simDate}
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
        onResume={() => {
          setReloadKey((k) => k + 1);
        }}
        onBill={handleViewBill}
        onEdit={handleEditCustomer}
        onDelete={() => {
          setReloadKey((k) => k + 1);
        }}
      />

      {/* T6 Transfer Modal */}
      {transferModalOpen && customerToTransfer && (
        <TransferModal
          customer={customerToTransfer}
          onClose={() => setTransferModalOpen(false)}
          onSuccess={() => {
            setReloadKey((k) => k + 1);
          }}
          showToast={showToast}
        />
      )}

      {/* T4 CSV Import Modal */}
      {importModalOpen && (
        <ImportModal
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => {
            setReloadKey((k) => k + 1);
          }}
          showToast={showToast}
        />
      )}

      {/* T1 Outbox Modal */}
      {outboxModalOpen && (
        <OutboxModal
          onClose={() => setOutboxModalOpen(false)}
          showToast={showToast}
        />
      )}
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
