import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Settings, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Target,
  Users
} from 'lucide-react';

interface ReportGeneratorProps {
  projectId: string;
  projectTitle: string;
}

interface ReportConfig {
  timeRange: '7d' | '30d' | '90d';
  format: 'pdf' | 'html';
  includeCharts: boolean;
  includeRawData: boolean;
  sections: {
    executiveSummary: boolean;
    metrics: boolean;
    trafficAnalysis: boolean;
    campaignPerformance: boolean;
    recommendations: boolean;
  };
  branding: {
    companyName: string;
    primaryColor: string;
  };
}

interface ValidationReport {
  projectId: string;
  projectTitle: string;
  generatedAt: string;
  timeRange: string;
  executiveSummary: {
    validationScore: number;
    marketViability: 'High' | 'Medium' | 'Low';
    recommendation: string;
    keyInsights: string[];
  };
  metrics: {
    totalTraffic: number;
    conversions: number;
    conversionRate: number;
    costPerAcquisition: number;
    returnOnAdSpend: number;
    bounceRate: number;
  };
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ projectId, projectTitle }) => {
  const [config, setConfig] = useState<ReportConfig>({
    timeRange: '30d',
    format: 'pdf',
    includeCharts: true,
    includeRawData: false,
    sections: {
      executiveSummary: true,
      metrics: true,
      trafficAnalysis: true,
      campaignPerformance: true,
      recommendations: true,
    },
    branding: {
      companyName: 'MVP Validator',
      primaryColor: '#3B82F6',
    },
  });

  const [generating, setGenerating] = useState(false);
  const [lastReport, setLastReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const generateReport = async () => {
    try {
      setGenerating(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          timeRange: config.timeRange,
          config: config,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const report = await response.json();
      setLastReport(report);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (format: 'pdf' | 'html' = config.format) => {
    if (!lastReport) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/reports/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reportData: lastReport,
          format,
          config,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation-report-${projectId}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Failed to download report. Please try again.');
    }
  };

  const updateConfig = (section: keyof ReportConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: value,
    }));
  };

  const updateSection = (section: keyof ReportConfig['sections'], enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: enabled,
      },
    }));
  };

  const getValidationScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMarketViabilityColor = (viability: string) => {
    switch (viability) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Validation Report</h2>
          <p className="text-gray-600">Generate comprehensive market validation reports</p>
        </div>
        <div className="flex items-center gap-3">
          {lastReport && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          )}
          <button
            onClick={generateReport}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Report Configuration</h3>
            </div>

            <div className="space-y-4">
              {/* Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Time Range
                </label>
                <select
                  value={config.timeRange}
                  onChange={(e) => updateConfig('timeRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select
                  value={config.format}
                  onChange={(e) => updateConfig('format', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="html">HTML Report</option>
                </select>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Options
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.includeCharts}
                      onChange={(e) => updateConfig('includeCharts', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Include Charts</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.includeRawData}
                      onChange={(e) => updateConfig('includeRawData', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Include Raw Data</span>
                  </label>
                </div>
              </div>

              {/* Sections */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Sections
                </label>
                <div className="space-y-2">
                  {Object.entries(config.sections).map(([section, enabled]) => (
                    <label key={section} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => updateSection(section as keyof ReportConfig['sections'], e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {section.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Branding */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branding
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={config.branding.companyName}
                    onChange={(e) => updateConfig('branding', { ...config.branding, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="color"
                    value={config.branding.primaryColor}
                    onChange={(e) => updateConfig('branding', { ...config.branding, primaryColor: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Preview/Results */}
        <div className="lg:col-span-2">
          {!lastReport && !showPreview ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Generated</h3>
              <p className="text-gray-600 mb-4">
                Configure your report settings and click "Generate Report" to create a comprehensive validation report.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Performance Metrics
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Target className="w-4 h-4" />
                  Campaign Analysis
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  Audience Insights
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Recommendations
                </div>
              </div>
            </div>
          ) : showPreview && lastReport ? (
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Report Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Validation Report Preview</h3>
                    <p className="text-gray-600">{lastReport.projectTitle}</p>
                    <p className="text-sm text-gray-500">
                      Generated: {new Date(lastReport.generatedAt).toLocaleString()} | 
                      Period: {lastReport.timeRange}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadReport('html')}
                      className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      HTML
                    </button>
                    <button
                      onClick={() => downloadReport('pdf')}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Executive Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getValidationScoreColor(lastReport.executiveSummary.validationScore)}`}>
                        {lastReport.executiveSummary.validationScore}/10
                      </div>
                      <div className="text-sm text-gray-600">Validation Score</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-center">
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getMarketViabilityColor(lastReport.executiveSummary.marketViability)}`}>
                        {lastReport.executiveSummary.marketViability}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Market Viability</div>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <p className="text-blue-800">
                    <strong>Recommendation:</strong> {lastReport.executiveSummary.recommendation}
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📈 Key Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {lastReport.metrics.totalTraffic.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Traffic</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {lastReport.metrics.conversions}
                    </div>
                    <div className="text-sm text-gray-600">Conversions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {(lastReport.metrics.conversionRate * 100).toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-600">Conversion Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      ${lastReport.metrics.costPerAcquisition.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Cost Per Acquisition</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {lastReport.metrics.returnOnAdSpend.toFixed(2)}x
                    </div>
                    <div className="text-sm text-gray-600">Return on Ad Spend</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {(lastReport.metrics.bounceRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Bounce Rate</div>
                  </div>
                </div>
              </div>

              {/* Key Insights */}
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">💡 Key Insights</h4>
                <div className="space-y-2">
                  {lastReport.executiveSummary.keyInsights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Report...</h3>
              <p className="text-gray-600">
                Please wait while we compile your validation data and generate insights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
