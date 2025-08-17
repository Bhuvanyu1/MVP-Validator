import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';

interface BillingDashboardProps {
  userId: string;
}

interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    interval: string;
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  amount: number;
  currency: string;
  created: string;
  paidAt?: string;
  hostedInvoiceUrl: string;
  invoicePdf: string;
}

interface BillingData {
  subscription?: Subscription;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  upcomingInvoice?: Invoice;
}

export const BillingDashboard: React.FC<BillingDashboardProps> = ({ userId }) => {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, [userId]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/billing/dashboard', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBillingData(data);
      } else {
        setError('Failed to fetch billing information');
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      setError('Failed to fetch billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!billingData?.subscription) return;
    
    setActionLoading('cancel');
    try {
      const response = await fetch('/api/billing/subscription/cancel', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchBillingData();
      } else {
        setError('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setError('Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!billingData?.subscription) return;
    
    setActionLoading('reactivate');
    try {
      const response = await fetch('/api/billing/subscription/reactivate', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchBillingData();
      } else {
        setError('Failed to reactivate subscription');
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      setError('Failed to reactivate subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    setActionLoading('payment');
    try {
      const response = await fetch('/api/billing/payment-method/update', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        setError('Failed to update payment method');
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
      setError('Failed to update payment method');
    } finally {
      setActionLoading(null);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'trialing':
        return 'text-blue-600 bg-blue-100';
      case 'past_due':
        return 'text-red-600 bg-red-100';
      case 'canceled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'open':
      case 'past_due':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'void':
      case 'canceled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <button
          onClick={fetchBillingData}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Current Subscription
            </h2>

            {billingData?.subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {billingData.subscription.plan.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatAmount(billingData.subscription.plan.amount, billingData.subscription.plan.currency)} 
                      / {billingData.subscription.plan.interval}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(billingData.subscription.status)}`}>
                    {billingData.subscription.status.charAt(0).toUpperCase() + billingData.subscription.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600">Current Period</p>
                    <p className="font-medium">
                      {formatDate(billingData.subscription.currentPeriodStart)} - {formatDate(billingData.subscription.currentPeriodEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Next Billing</p>
                    <p className="font-medium">
                      {billingData.subscription.cancelAtPeriodEnd 
                        ? 'Canceled at period end' 
                        : formatDate(billingData.subscription.currentPeriodEnd)
                      }
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  {billingData.subscription.cancelAtPeriodEnd ? (
                    <button
                      onClick={handleReactivateSubscription}
                      disabled={actionLoading === 'reactivate'}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {actionLoading === 'reactivate' && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Reactivate Subscription
                    </button>
                  ) : (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={actionLoading === 'cancel'}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {actionLoading === 'cancel' && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Cancel Subscription
                    </button>
                  )}
                  
                  <button
                    onClick={handleUpdatePaymentMethod}
                    disabled={actionLoading === 'payment'}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading === 'payment' && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <Settings className="w-4 h-4" />
                    Manage Payment
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h3>
                <p className="text-gray-600 mb-4">Start validating your ideas with our premium features</p>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 mx-auto">
                  <Plus className="w-4 h-4" />
                  Subscribe Now
                </button>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Payment History
            </h2>

            {billingData?.invoices && billingData.invoices.length > 0 ? (
              <div className="space-y-3">
                {billingData.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(invoice.status)}
                      <div>
                        <p className="font-medium">Invoice #{invoice.number}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(invoice.created)}
                          {invoice.paidAt && ` • Paid ${formatDate(invoice.paidAt)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formatAmount(invoice.amount, invoice.currency)}
                      </span>
                      <button
                        onClick={() => window.open(invoice.invoicePdf, '_blank')}
                        className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No payment history available</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Methods */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </h3>

            {billingData?.paymentMethods && billingData.paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {billingData.paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          {method.card?.brand.toUpperCase()} •••• {method.card?.last4}
                        </p>
                        <p className="text-sm text-gray-600">
                          Expires {method.card?.expMonth}/{method.card?.expYear}
                        </p>
                      </div>
                    </div>
                    {method.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No payment methods</p>
              </div>
            )}

            <button
              onClick={handleUpdatePaymentMethod}
              className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Payment Method
            </button>
          </div>

          {/* Upcoming Invoice */}
          {billingData?.upcomingInvoice && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Upcoming Invoice</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-medium">
                    {formatAmount(billingData.upcomingInvoice.amount, billingData.upcomingInvoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">
                    {formatDate(billingData.upcomingInvoice.created)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingDashboard;
