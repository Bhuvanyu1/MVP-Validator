import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Users, MousePointer, DollarSign,
  Globe, Smartphone, Monitor, Tablet, Target, Zap, Award, RefreshCw,
  Eye, Clock, Percent, ArrowUp, ArrowDown, Minus, ChevronRight,
  Play, Pause, CheckCircle,
} from 'lucide-react';

interface MetricComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

interface AdvancedMetrics {
  pageViews: MetricComparison;
  sessions: MetricComparison;
  conversionRate: MetricComparison;
  roas: MetricComparison;
  uniqueVisitors: MetricComparison;
  bounceRate: MetricComparison;
  avgSessionDuration: MetricComparison;
  impressions: MetricComparison;
  clicks: MetricComparison;
  ctr: MetricComparison;
  cpc: MetricComparison;
}

interface PlatformBreakdown {
  platform: string;
  sessions: number;
  conversions: number;
  revenue: number;
  spend: number;
  roas: number;
  conversionRate: number;
}

interface GeographicBreakdown {
  country: string;
  countryCode: string;
  sessions: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

interface DeviceBreakdown {
  device: string;
  sessions: number;
  conversions: number;
  bounceRate: number;
  conversionRate: number;
}

interface FunnelStep {
  step: string;
  users: number;
  conversionRate: number;
  dropOffRate: number;
}

interface ABTestResult {
  testId: string;
  testName: string;
  status: 'running' | 'completed' | 'paused';
  variants: {
    variant: string;
    conversionRate: number;
    isWinner: boolean;
  }[];
  confidence: number;
}

interface AdvancedAnalyticsData {
  metrics: AdvancedMetrics;
  platformBreakdown: PlatformBreakdown[];
  geographicBreakdown: GeographicBreakdown[];
  deviceBreakdown: DeviceBreakdown[];
  funnelAnalysis: FunnelStep[];
  abTestResults: ABTestResult[];
}

interface DemandValidationScore {
  score: number;
  factors: {
    trafficQuality: number;
    conversionRate: number;
    engagement: number;
    retention: number;
    marketFit: number;
  };
  recommendation: string;
}

interface AdvancedAnalyticsDashboardProps {
  projectId: string;
}

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  projectId,
}) => {
  const [data, setData] = useState<AdvancedAnalyticsData | null>(null);
  const [validationScore, setValidationScore] = useState<DemandValidationScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'platforms' | 'audience' | 'funnel' | 'abtests'>('overview');
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [projectId, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      const response = await fetch(`/api/projects/${projectId}/advanced-analytics?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData.data);
        setValidationScore(analyticsData.validationScore);
      } else {
        throw new Error('Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatPercent = (value: number): string => {
    return (value * 100).toFixed(1) + '%';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'down': return <ArrowDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'desktop': return <Monitor className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getTestStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
      default: return <Play className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading advanced analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error || 'No data available'}</div>
        <button
          onClick={fetchAnalyticsData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
          <p className="text-gray-600">Comprehensive insights and market validation</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Validation Score */}
      {validationScore && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Market Validation Score</h3>
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-900">{validationScore.score.toFixed(1)}/10</span>
            </div>
          </div>
          <p className="text-gray-700 mb-4">{validationScore.recommendation}</p>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(validationScore.factors).map(([factor, score]) => (
              <div key={factor} className="text-center">
                <div className="text-sm font-medium text-gray-600 mb-1">
                  {factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </div>
                <div className="text-lg font-bold text-gray-900">{score.toFixed(1)}</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(score / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'platforms', label: 'Platforms', icon: Target },
            { key: 'audience', label: 'Audience', icon: Users },
            { key: 'funnel', label: 'Funnel', icon: TrendingUp },
            { key: 'abtests', label: 'A/B Tests', icon: Zap },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { key: 'pageViews', label: 'Page Views', icon: Eye, format: formatNumber },
            { key: 'sessions', label: 'Sessions', icon: Users, format: formatNumber },
            { key: 'conversionRate', label: 'Conversion Rate', icon: Percent, format: formatPercent },
            { key: 'roas', label: 'ROAS', icon: DollarSign, format: (v: number) => v.toFixed(1) + 'x' },
          ].map(({ key, label, icon: Icon, format }) => {
            const metric = data.metrics[key as keyof AdvancedMetrics];
            return (
              <div key={key} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 text-gray-400" />
                  {getTrendIcon(metric.trend)}
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {format(metric.current)}
                </div>
                <div className="text-sm text-gray-600 mb-2">{label}</div>
                <div className={`text-sm ${getTrendColor(metric.trend)}`}>
                  {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}% vs previous
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'platforms' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Platform Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROAS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.platformBreakdown.map((platform) => (
                  <tr key={platform.platform} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {platform.platform}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(platform.sessions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(platform.conversions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(platform.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {platform.roas === Infinity ? '∞' : platform.roas.toFixed(2) + 'x'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audience' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Geographic Performance
            </h3>
            <div className="space-y-4">
              {data.geographicBreakdown.map((geo) => (
                <div key={geo.countryCode} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">
                      {geo.countryCode === 'US' ? '🇺🇸' : 
                       geo.countryCode === 'CA' ? '🇨🇦' : 
                       geo.countryCode === 'GB' ? '🇬🇧' : 
                       geo.countryCode === 'AU' ? '🇦🇺' : '🇩🇪'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{geo.country}</div>
                      <div className="text-sm text-gray-600">{formatNumber(geo.sessions)} sessions</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatPercent(geo.conversionRate)}</div>
                    <div className="text-sm text-gray-600">{formatCurrency(geo.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Performance</h3>
            <div className="space-y-4">
              {data.deviceBreakdown.map((device) => (
                <div key={device.device} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getDeviceIcon(device.device)}
                    <div>
                      <div className="font-medium text-gray-900">{device.device}</div>
                      <div className="text-sm text-gray-600">{formatNumber(device.sessions)} sessions</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatPercent(device.conversionRate)}</div>
                    <div className="text-sm text-gray-600">Bounce: {formatPercent(device.bounceRate)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'funnel' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
          <div className="space-y-4">
            {data.funnelAnalysis.map((step, index) => (
              <div key={step.step} className="relative">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{step.step}</div>
                      <div className="text-sm text-gray-600">{formatNumber(step.users)} users</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatPercent(step.conversionRate)}</div>
                    {index > 0 && (
                      <div className="text-sm text-red-600">Drop-off: {formatPercent(step.dropOffRate)}</div>
                    )}
                  </div>
                </div>
                {index < data.funnelAnalysis.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'abtests' && (
        <div className="space-y-6">
          {data.abTestResults.map((test) => (
            <div key={test.testId} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getTestStatusIcon(test.status)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{test.testName}</h3>
                    <p className="text-sm text-gray-600">Confidence: {test.confidence}%</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  test.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  test.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {test.variants.map((variant) => (
                  <div key={variant.variant} className={`p-4 rounded-lg border-2 ${
                    variant.isWinner ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{variant.variant}</span>
                      {variant.isWinner && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Winner</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {formatPercent(variant.conversionRate)}
                    </div>
                    <div className="text-sm text-gray-600">Conversion Rate</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
