import { useStatus, getUserId } from './hooks/useStatus';
import { useActions } from './hooks/useActions';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import StockBar from './components/StockBar';
import StatusGrid from './components/StatusGrid';
import ActionPanel from './components/ActionPanel';
import RulesSection from './components/RulesSection';
import Toast from './components/Toast';
import './App.css';

export default function App() {
  const userId = getUserId();
  const { status, setStatus, holdCountdown, message, fetchStatus, showMessage } =
    useStatus(userId);

  const {
    loading,
    paymentPending,
    handleBuy,
    handleJoinWaitlist,
    handleLeaveWaitlist,
    handlePay,
    handleReset,
  } = useActions({
    userId,
    status,
    setStatus,
    fetchStatus,
    showMessage,
  });

  const purchasesDone = status?.purchases ?? 0;
  const maxed = purchasesDone >= 2;

  return (
    <div className="app">
      <Header userId={userId} />

      <main className="main">
        <section className="product-section">
          <ProductCard />
          <StockBar stock={status?.stock} />
        </section>

        <StatusGrid
          status={status}
          holdCountdown={holdCountdown}
          purchasesDone={purchasesDone}
          maxed={maxed}
        />

        <Toast message={message} />

        <ActionPanel
          status={status}
          holdCountdown={holdCountdown}
          loading={loading}
          paymentPending={paymentPending}
          onBuy={() => void handleBuy()}
          onPay={() => void handlePay()}
          onJoinWaitlist={() => void handleJoinWaitlist()}
          onLeaveWaitlist={() => void handleLeaveWaitlist()}
          onReset={() => void handleReset()}
        />

        <RulesSection />
      </main>
    </div>
  );
}
