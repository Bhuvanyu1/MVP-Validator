import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Shield, 
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface PerformanceStats {
  [operation: string]: {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  };
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  performance: PerformanceStats;
  errors: Record<string, number>;
  uptime: number;
}

interface CacheStats {
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  localCacheSize: number;
}

interface SecurityStats {
  blockedIPs: number;
  suspiciousActivities: number;
  recentEvents: Array<{ event: string; count: number }>;
}

const PerformanceMonitor: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthCheck | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthResponse, cacheResponse, securityResponse] = await Promise.all([
        fetch('/api/monitoring/health'),
        fetch('/api/monitoring/cache-stats'),
        fetch('/api/monitoring/security-stats')
      ]);

      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setHealthData(health);
      }

      if (cacheResponse.ok) {
        const cache = await cacheResponse.json();
        setCacheStats(cache);
      }

      if (securityResponse.ok) {
        const security = await securityResponse.json();
        setSecurityStats(security);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();

    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading monitoring data...
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load monitoring data: {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={fetchMonitoringData}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <p className="text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMonitoringData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              {getStatusIcon(healthData.status)}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getStatusColor(healthData.status)}`}>
                {healthData.status.charAt(0).toUpperCase() + healthData.status.slice(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(healthData.timestamp).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatUptime(healthData.uptime)}
              </div>
              <p className="text-xs text-muted-foreground">
                System uptime
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(healthData.errors).reduce((a, b) => a + b, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all endpoints
              </p>
            </CardContent>
          </Card>

          {cacheStats && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(cacheStats.hitRate * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {cacheStats.totalHits} hits, {cacheStats.totalMisses} misses
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Response times and operation performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData?.performance && Object.keys(healthData.performance).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(healthData.performance).map(([operation, stats]) => (
                    <div key={operation} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{operation}</h4>
                        <Badge variant="outline">{stats.count} calls</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Average:</span>
                          <div className="font-medium">{formatDuration(stats.average)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min:</span>
                          <div className="font-medium">{formatDuration(stats.min)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max:</span>
                          <div className="font-medium">{formatDuration(stats.max)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">95th %ile:</span>
                          <div className="font-medium">{formatDuration(stats.p95)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No performance data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Statistics</CardTitle>
              <CardDescription>
                Cache performance and hit rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cacheStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Hit Rate</h4>
                      <div className="text-3xl font-bold text-green-600">
                        {(cacheStats.hitRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Cache Size</h4>
                      <div className="text-2xl font-bold">
                        {cacheStats.localCacheSize} entries
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Total Hits</h4>
                      <div className="text-2xl font-bold text-green-600">
                        {cacheStats.totalHits.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Total Misses</h4>
                      <div className="text-2xl font-bold text-orange-600">
                        {cacheStats.totalMisses.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No cache data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Metrics</CardTitle>
              <CardDescription>
                Security events and blocked activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {securityStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Blocked IPs</h4>
                      <div className="text-3xl font-bold text-red-600">
                        {securityStats.blockedIPs}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Suspicious Activities</h4>
                      <div className="text-3xl font-bold text-orange-600">
                        {securityStats.suspiciousActivities}
                      </div>
                    </div>
                  </div>
                  
                  {securityStats.recentEvents.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-4">Recent Security Events</h4>
                      <div className="space-y-2">
                        {securityStats.recentEvents.map((event, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <span className="font-medium">{event.event.replace(/_/g, ' ')}</span>
                            <Badge variant="outline">{event.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No security data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Statistics</CardTitle>
              <CardDescription>
                Recent errors and their frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData?.errors && Object.keys(healthData.errors).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(healthData.errors)
                    .sort(([,a], [,b]) => b - a)
                    .map(([error, count]) => (
                      <div key={error} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{error.split(':')[0]}</div>
                          <div className="text-sm text-muted-foreground">
                            {error.split(':').slice(1).join(':')}
                          </div>
                        </div>
                        <Badge variant="destructive">{count}</Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-medium text-green-600">No errors detected</p>
                  <p className="text-muted-foreground">System is running smoothly</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceMonitor;
