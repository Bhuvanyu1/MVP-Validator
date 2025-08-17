import React, { useState, useEffect } from 'react';
import { Bell, Mail, Settings, Check, X } from 'lucide-react';

interface NotificationPreferences {
  prototypeGenerated: boolean;
  campaignLaunched: boolean;
  paymentCompleted: boolean;
  reportReady: boolean;
  validationComplete: boolean;
  weeklyDigest: boolean;
  marketingUpdates: boolean;
}

interface NotificationSettingsProps {
  userId: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userId }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    prototypeGenerated: true,
    campaignLaunched: true,
    paymentCompleted: true,
    reportReady: true,
    validationComplete: true,
    weeklyDigest: false,
    marketingUpdates: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testEmailSent, setTestEmailSent] = useState(false);

  // Load user preferences on component mount
  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/notification-preferences`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences || preferences);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/notification-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    try {
      const response = await fetch('/api/notifications/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [{ email: 'user@example.com', name: 'Test User' }],
          subject: 'Test Email from MVP Validator',
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">Test Email</h2>
              <p>This is a test email to verify your notification settings are working correctly.</p>
              <p>If you received this email, your notifications are configured properly!</p>
              <p>Best regards,<br>The MVP Validator Team</p>
            </div>
          `,
          textContent: 'This is a test email from MVP Validator. If you received this, your notifications are working correctly!'
        }),
      });

      if (response.ok) {
        setTestEmailSent(true);
        setTimeout(() => setTestEmailSent(false), 3000);
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const notificationTypes = [
    {
      key: 'prototypeGenerated' as keyof NotificationPreferences,
      title: 'Prototype Generated',
      description: 'When your MVP prototype is ready for review',
      icon: <Settings className="w-5 h-5" />
    },
    {
      key: 'campaignLaunched' as keyof NotificationPreferences,
      title: 'Campaign Launched',
      description: 'When your validation campaign goes live',
      icon: <Bell className="w-5 h-5" />
    },
    {
      key: 'paymentCompleted' as keyof NotificationPreferences,
      title: 'Payment Completed',
      description: 'When your payment is processed successfully',
      icon: <Check className="w-5 h-5" />
    },
    {
      key: 'reportReady' as keyof NotificationPreferences,
      title: 'Report Ready',
      description: 'When your validation report is available for download',
      icon: <Mail className="w-5 h-5" />
    },
    {
      key: 'validationComplete' as keyof NotificationPreferences,
      title: 'Validation Complete',
      description: 'When your market validation process is finished',
      icon: <Check className="w-5 h-5" />
    },
    {
      key: 'weeklyDigest' as keyof NotificationPreferences,
      title: 'Weekly Digest',
      description: 'Weekly summary of your project progress',
      icon: <Mail className="w-5 h-5" />
    },
    {
      key: 'marketingUpdates' as keyof NotificationPreferences,
      title: 'Marketing Updates',
      description: 'Product updates and feature announcements',
      icon: <Bell className="w-5 h-5" />
    }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Choose which email notifications you'd like to receive for your MVP validation projects.
      </p>

      <div className="space-y-4 mb-6">
        {notificationTypes.map((type) => (
          <div key={type.key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="text-gray-500">
                {type.icon}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{type.title}</h3>
                <p className="text-sm text-gray-600">{type.description}</p>
              </div>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences[type.key]}
                onChange={() => handlePreferenceChange(type.key)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 pt-6 border-t">
        <button
          onClick={savePreferences}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Settings className="w-4 h-4" />
          )}
          {saved ? 'Saved!' : 'Save Preferences'}
        </button>

        <button
          onClick={sendTestEmail}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          <Mail className="w-4 h-4" />
          {testEmailSent ? 'Test Email Sent!' : 'Send Test Email'}
        </button>
      </div>

      {saved && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800">Your notification preferences have been saved successfully.</span>
          </div>
        </div>
      )}

      {testEmailSent && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">Test email sent! Check your inbox to verify notifications are working.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
