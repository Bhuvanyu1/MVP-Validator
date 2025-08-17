import React, { useState, useEffect } from 'react';
import { BarChart3, Users, MousePointer, TrendingUp, Globe, Smartphone, Monitor, Tablet } from 'lucide-react';

interface LandingPageAnalytics {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions: number;
  conversionRate: number;
  topSources: Array<{ source: string; sessions: number }>;
  deviceBreakdown: Array<{ device: string; sessions: number }>;
  geographicData: Array<{ country: string; sessions: number }>;
}

interface CampaignAnalytics {
  sessions: number;
  pageViews: number;
  conversions: number;
  revenue: number;
  costPerAcquisition: number;
  returnOnAdSpend: number;
  conversionPaths: Array<{ path: string; conversions: number }>;
}

interface AnalyticsDashboardProps {
  projectId: string;
  type: 'landing-page' | 'campaign';
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ projectId, type }) => {
  const [analytics, setAnalytics] = useState<LandingPageAnalytics | CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealData, setIsRealData] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [projectId, type]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const endpoint = type === 'landing-page' 
        ? `/api/projects/${projectId}/landing-page/analytics`
        : `/api/projects/${projectId}/campaign/analytics`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data.analytics);
      setIsRealData(data.isRealData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-red-600">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Failed to load analytics: {error}</p>
          <button 
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'desktop': return <Monitor className="h-4 w-4" />;
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const renderLandingPageAnalytics = (data: LandingPageAnalytics) => (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Page Views</p>
              <p className="text-2xl font-bold text-blue-900">{formatNumber(data.pageViews)}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Unique Visitors</p>
              <p className="text-2xl font-bold text-green-900">{formatNumber(data.uniqueVisitors)}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Conversions</p>
              <p className="text-2xl font-bold text-purple-900">{data.conversions}</p>
            </div>
            <MousePointer className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-orange-900">{data.conversionRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
          <p className="text-xl font-bold text-gray-900">{data.bounceRate.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Avg Session Duration</p>
          <p className="text-xl font-bold text-gray-900">{formatDuration(data.avgSessionDuration)}</p>
        </div>
      </div>

      {/* Charts and Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Sources */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Traffic Sources</h3>
          <div className="space-y-3">
            {data.topSources.map((source, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <Globe className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm font-medium capitalize">{source.source}</span>
                </div>
                <span className="text-sm text-gray-600">{formatNumber(source.sessions)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
          <div className="space-y-3">
            {data.deviceBreakdown.map((device, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  {getDeviceIcon(device.device)}
                  <span className="text-sm font-medium capitalize ml-2">{device.device}</span>
                </div>
                <span className="text-sm text-gray-600">{formatNumber(device.sessions)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Data */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Countries</h3>
          <div className="space-y-3">
            {data.geographicData.map((country, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{country.country}</span>
                <span className="text-sm text-gray-600">{formatNumber(country.sessions)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderCampaignAnalytics = (data: CampaignAnalytics) => (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Sessions</p>
              <p className="text-2xl font-bold text-blue-900">{formatNumber(data.sessions)}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Conversions</p>
              <p className="text-2xl font-bold text-green-900">{data.conversions}</p>
            </div>
            <MousePointer className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Revenue</p>
              <p className="text-2xl font-bold text-purple-900">${data.revenue.toFixed(0)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">ROAS</p>
              <p className="text-2xl font-bold text-orange-900">{data.returnOnAdSpend.toFixed(1)}x</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Cost Per Acquisition</p>
          <p className="text-xl font-bold text-gray-900">${data.costPerAcquisition.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Page Views</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(data.pageViews)}</p>
        </div>
      </div>

      {/* Conversion Paths */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Conversion Paths</h3>
        <div className="space-y-3">
          {data.conversionPaths.map((path, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm font-medium">{path.path}</span>
              <span className="text-sm text-gray-600">{path.conversions} conversions</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {type === 'landing-page' ? 'Landing Page Analytics' : 'Campaign Analytics'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isRealData ? 'Real-time data from Google Analytics 4' : 'Simulated data for demonstration'}
            {!isRealData && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                Demo Mode
              </span>
            )}
          </p>
        </div>
        <button 
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Analytics Content */}
      {type === 'landing-page' 
        ? renderLandingPageAnalytics(analytics as LandingPageAnalytics)
        : renderCampaignAnalytics(analytics as CampaignAnalytics)
      }
    </div>
  );
};

export default AnalyticsDashboard;
