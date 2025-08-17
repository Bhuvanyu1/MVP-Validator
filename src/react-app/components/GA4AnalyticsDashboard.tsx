import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Globe, 
  Target, 
  Clock, 
  RefreshCw,
  Eye,
  MousePointer,
  Calendar,
  MapPin,
  Smartphone,
  Monitor,
  Tablet,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface GA4AnalyticsDashboardProps {
  projectId: string;
  landingPageUrl?: string;
}

interface RealTimeMetrics {
  activeUsers: number;
  pageViews: number;
  conversions: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
}

interface TrafficSource {
  source: string;
  medium: string;
  users: number;
  sessions: number;
  conversions: number;
  percentage: number;
}

interface DeviceCategory {
  category: string;
  users: number;
  sessions: number;
  percentage: number;
}

interface GeographicData {
  country: string;
  users: number;
  sessions: number;
  conversions: number;
}

interface ConversionGoal {
  name: string;
  completions: number;
  conversionRate: number;
  value: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

interface TimeSeriesData {
  timestamp: string;
  users: number;
  pageViews: number;
  conversions: number;
}

interface GA4AnalyticsData {
  realTimeMetrics: RealTimeMetrics;
  trafficSources: TrafficSource[];
  deviceCategories: DeviceCategory[];
  geographicData: GeographicData[];
  conversionGoals: ConversionGoal[];
  timeSeriesData: TimeSeriesData[];
  lastUpdated: string;
}

export const GA4AnalyticsDashboard: React.FC<GA4AnalyticsDashboardProps> = ({ 
  projectId, 
  landingPageUrl 
}) => {
  const [analyticsData, setAnalyticsData] = useState<GA4AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchAnalyticsData();
    // Set up auto-refresh for real-time data
    const interval = setInterval(fetchAnalyticsData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [projectId, selectedTimeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/projects/${projectId}/analytics/ga4?timeRange=${selectedTimeRange}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
        setError(null);
      } else {
        setError('Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching GA4 analytics:', error);
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDeviceIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      case 'desktop':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Error</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchAnalyticsData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">Analytics data will appear once your landing page receives traffic</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">GA4 Real-time Analytics</h2>
          <p className="text-gray-600">
            Last updated: {new Date(analyticsData.lastUpdated).toLocaleTimeString()}
            {refreshing && <span className="ml-2 text-blue-600">Refreshing...</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === '1h' ? '1 Hour' : range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAnalyticsData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analyticsData.realTimeMetrics.activeUsers)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <Clock className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-gray-600">Right now</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Page Views</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analyticsData.realTimeMetrics.pageViews)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-600">+{analyticsData.realTimeMetrics.newUsers} new users</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversions</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.realTimeMetrics.conversions}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-600">
              {formatPercentage((analyticsData.realTimeMetrics.conversions / analyticsData.realTimeMetrics.pageViews) * 100)} conversion rate
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Session</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(analyticsData.realTimeMetrics.avgSessionDuration)}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-600">
              {formatPercentage(analyticsData.realTimeMetrics.bounceRate)} bounce rate
            </span>
          </div>
        </div>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Traffic Sources
          </h3>
          <div className="space-y-4">
            {analyticsData.trafficSources.map((source, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{source.source}</span>
                    <span className="text-sm text-gray-600">{formatPercentage(source.percentage)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${source.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>{formatNumber(source.users)} users</span>
                    <span>{source.conversions} conversions</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Categories */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Device Categories
          </h3>
          <div className="space-y-4">
            {analyticsData.deviceCategories.map((device, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {getDeviceIcon(device.category)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 capitalize">{device.category}</span>
                    <span className="text-sm text-gray-600">{formatPercentage(device.percentage)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${device.percentage}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {formatNumber(device.users)} users • {formatNumber(device.sessions)} sessions
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Goals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Conversion Goals
          </h3>
          <div className="space-y-4">
            {analyticsData.conversionGoals.map((goal, index) => (
              <div key={index} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{goal.name}</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(goal.trend)}
                    <span className={`text-sm ${
                      goal.trend === 'up' ? 'text-green-600' : 
                      goal.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {goal.change > 0 ? '+' : ''}{goal.change}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Completions</p>
                    <p className="font-semibold">{goal.completions}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Rate</p>
                    <p className="font-semibold">{formatPercentage(goal.conversionRate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Value</p>
                    <p className="font-semibold">${goal.value.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Data */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Geographic Data
          </h3>
          <div className="space-y-3">
            {analyticsData.geographicData.map((geo, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs font-medium">
                    {geo.country.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{geo.country}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{formatNumber(geo.users)}</div>
                  <div className="text-xs text-gray-600">{geo.conversions} conversions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time Series Chart Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Traffic Trends
        </h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Interactive chart visualization</p>
            <p className="text-sm text-gray-500">Chart library integration coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GA4AnalyticsDashboard;
