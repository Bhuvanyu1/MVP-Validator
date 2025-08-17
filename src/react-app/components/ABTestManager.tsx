import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, Square, BarChart3, TrendingUp, Users, Target, Settings } from 'lucide-react';

interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number;
  config: {
    headline?: string;
    subheadline?: string;
    ctaText?: string;
    ctaColor?: string;
    pricing?: number;
    features?: string[];
    layout?: 'standard' | 'minimal' | 'detailed';
  };
}

interface ABTest {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  variants: ABTestVariant[];
  metrics: {
    primaryMetric: 'conversion_rate' | 'click_through_rate' | 'engagement_time' | 'signup_rate';
    secondaryMetrics: string[];
  };
  results?: {
    totalVisitors: number;
    totalConversions: number;
    overallConversionRate: number;
    statisticalSignificance: number;
    winner?: string;
    variantResults: Array<{
      variantId: string;
      visitors: number;
      conversions: number;
      conversionRate: number;
      improvement: number;
      significance: number;
    }>;
    insights: string[];
    recommendations: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface ABTestManagerProps {
  projectId: string;
}

const ABTestManager: React.FC<ABTestManagerProps> = ({ projectId }) => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);

  useEffect(() => {
    loadABTests();
  }, [projectId]);

  const loadABTests = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/ab-tests`);
      if (response.ok) {
        const data = await response.json();
        setTests(data.tests || []);
      }
    } catch (error) {
      console.error('Failed to load A/B tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTest = async (testId: string) => {
    try {
      const response = await fetch(`/api/ab-tests/${testId}/start`, {
        method: 'POST',
      });
      if (response.ok) {
        loadABTests();
      }
    } catch (error) {
      console.error('Failed to start test:', error);
    }
  };

  const pauseTest = async (testId: string) => {
    try {
      const response = await fetch(`/api/ab-tests/${testId}/pause`, {
        method: 'POST',
      });
      if (response.ok) {
        loadABTests();
      }
    } catch (error) {
      console.error('Failed to pause test:', error);
    }
  };

  const stopTest = async (testId: string) => {
    try {
      const response = await fetch(`/api/ab-tests/${testId}/stop`, {
        method: 'POST',
      });
      if (response.ok) {
        loadABTests();
      }
    } catch (error) {
      console.error('Failed to stop test:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'completed': return <Square className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">A/B Testing</h2>
          <p className="text-gray-600">Test different variations of your landing page to optimize conversions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Test
        </button>
      </div>

      {/* Tests List */}
      {tests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No A/B tests yet</h3>
          <p className="text-gray-600 mb-4">Create your first A/B test to start optimizing your landing page conversions.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Your First Test
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {tests.map((test) => (
            <div key={test.id} className="bg-white border rounded-lg p-6">
              {/* Test Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
                  <p className="text-gray-600">{test.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                    {getStatusIcon(test.status)}
                    {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                  </span>
                  <div className="flex gap-2">
                    {test.status === 'draft' && (
                      <button
                        onClick={() => startTest(test.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Start Test"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {test.status === 'running' && (
                      <>
                        <button
                          onClick={() => pauseTest(test.id)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                          title="Pause Test"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => stopTest(test.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Stop Test"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {test.status === 'paused' && (
                      <button
                        onClick={() => startTest(test.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Resume Test"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedTest(test)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Metrics */}
              {test.results && (
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Visitors</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{test.results.totalVisitors.toLocaleString()}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Conversions</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{test.results.totalConversions.toLocaleString()}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Conversion Rate</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{test.results.overallConversionRate.toFixed(2)}%</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Significance</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{(test.results.statisticalSignificance * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {/* Variants */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Variants ({test.variants.length})</h4>
                <div className="grid gap-3">
                  {test.variants.map((variant, index) => {
                    const variantResult = test.results?.variantResults.find(r => r.variantId === variant.id);
                    const isWinner = test.results?.winner === variant.id;
                    
                    return (
                      <div key={variant.id} className={`p-3 border rounded-lg ${isWinner ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{variant.name}</span>
                              {index === 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Control</span>}
                              {isWinner && <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Winner</span>}
                            </div>
                            <p className="text-sm text-gray-600">{variant.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{variant.weight}% traffic</div>
                            {variantResult && (
                              <div className="text-xs text-gray-600">
                                {variantResult.conversionRate.toFixed(2)}% conversion
                                {variantResult.improvement !== 0 && (
                                  <span className={`ml-1 ${variantResult.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ({variantResult.improvement > 0 ? '+' : ''}{variantResult.improvement.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Insights */}
              {test.results?.insights && test.results.insights.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Key Insights</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {test.results.insights.map((insight, index) => (
                      <li key={index}>• {insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {test.results?.recommendations && test.results.recommendations.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h5 className="font-medium text-green-900 mb-2">Recommendations</h5>
                  <ul className="text-sm text-green-800 space-y-1">
                    {test.results.recommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <CreateTestModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadABTests();
          }}
        />
      )}

      {/* Test Details Modal */}
      {selectedTest && (
        <TestDetailsModal
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
        />
      )}
    </div>
  );
};

// Placeholder components for modals
const CreateTestModal: React.FC<{
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}> = ({ projectId, onClose, onCreated }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Create A/B Test</h3>
        <p className="text-gray-600 mb-4">A/B test creation form would go here...</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onCreated}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Test
          </button>
        </div>
      </div>
    </div>
  );
};

const TestDetailsModal: React.FC<{
  test: ABTest;
  onClose: () => void;
}> = ({ test, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{test.name} - Detailed Results</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-600 mb-4">Detailed test results and analytics would go here...</p>
      </div>
    </div>
  );
};

export default ABTestManager;
