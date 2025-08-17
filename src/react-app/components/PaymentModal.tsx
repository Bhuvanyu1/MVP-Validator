import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

interface PaymentStatus {
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  latestPayment?: {
    id: number;
    status: string;
    amount: number;
    currency: string;
    createdAt: string;
  };
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle,
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch payment status when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      fetchPaymentStatus();
    }
  }, [isOpen, projectId]);

  const fetchPaymentStatus = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/payment/status`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentStatus(data);
      } else {
        setError('Failed to fetch payment status');
      }
    } catch (error) {
      console.error('Error fetching payment status:', error);
      setError('Failed to fetch payment status');
    }
  };

  const handleCheckoutPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/payment/create-checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        } else {
          setError(data.error || 'Failed to create checkout session');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError('Failed to process payment');
    } finally {
      setLoading(false);
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Payment Successful';
      case 'paid':
        return 'Paid';
      case 'failed':
        return 'Payment Failed';
      case 'pending':
        return 'Payment Pending';
      case 'unpaid':
        return 'Payment Required';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              MVP Validation Service
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {projectTitle}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Service Details */}
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-8 h-8 text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Complete Market Validation
                  </h4>
                  <p className="text-sm text-gray-600">
                    Landing page creation, ad campaigns, and detailed analytics
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">$100</div>
                <div className="text-xs text-gray-500">One-time payment</div>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          {paymentStatus && (
            <div className="mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(paymentStatus.paymentStatus)}
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {getStatusText(paymentStatus.paymentStatus)}
                    </h4>
                    {paymentStatus.latestPayment && (
                      <p className="text-sm text-gray-600">
                        {formatAmount(paymentStatus.latestPayment.amount, paymentStatus.latestPayment.currency)} • {formatDate(paymentStatus.latestPayment.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Service Features */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">What's Included:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Professional landing page creation</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Google Ads campaign management</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Real-time analytics and insights</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Comprehensive validation report</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Market demand analysis</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          {paymentStatus?.paymentStatus === 'paid' ? (
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Payment Complete</span>
            </div>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckoutPayment}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>Pay with Stripe</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
