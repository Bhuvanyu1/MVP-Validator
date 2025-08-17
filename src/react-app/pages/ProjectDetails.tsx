import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  PlayCircle, 
  FileText,
  Wand2,
  Globe,
  BarChart3,
  Download,
  Github,
  ExternalLink,
  CreditCard,
  Zap
} from 'lucide-react';
import { Project } from '@/shared/types';
import GitHubIntegration from '@/react-app/components/GitHubIntegration';
import LandingPageBuilder from '../components/LandingPageBuilder';
import CampaignManager from '../components/CampaignManager';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { AdvancedAnalyticsDashboard } from '../components/AdvancedAnalyticsDashboard';
import { PaymentModal } from '../components/PaymentModal';
import BillingDashboard from '../components/BillingDashboard';
import GA4AnalyticsDashboard from '../components/GA4AnalyticsDashboard';
import { ReportGenerator } from '../components/ReportGenerator';
import ABTestManager from '../components/ABTestManager';

interface ProjectDetailsData {
  project: Project;
  prototype?: any;
  landingPage?: any;
  campaign?: any;
  analytics?: any;
}

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ProjectDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPrototype, setGeneratingPrototype] = useState(false);
  const [showLandingPageBuilder, setShowLandingPageBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'prototype' | 'landing' | 'campaign' | 'analytics' | 'advanced-analytics' | 'ga4-analytics' | 'reports' | 'billing'>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const projectData = await response.json();
        setData(projectData);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const generatePrototype = async () => {
    if (!data) return;
    
    setGeneratingPrototype(true);
    try {
      const response = await fetch(`/api/projects/${id}/generate-prototype`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await fetchProjectData(); // Refresh data
      }
    } catch (error) {
      console.error('Error generating prototype:', error);
    } finally {
      setGeneratingPrototype(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { project, prototype, landingPage, analytics } = data;

  const statusConfig = {
    draft: {
      icon: Clock,
      label: 'Draft',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      description: 'Project created, ready to generate prototype'
    },
    prototype_generated: {
      icon: FileText,
      label: 'Prototype Ready',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'AI-generated prototype available for review'
    },
    landing_page_created: {
      icon: PlayCircle,
      label: 'Landing Page Live',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Landing page deployed, ready to launch campaign'
    },
    campaign_launched: {
      icon: TrendingUp,
      label: 'Campaign Running',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Market validation campaign in progress'
    },
    completed: {
      icon: CheckCircle,
      label: 'Completed',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Validation complete, report available'
    }
  };

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{project.ideaDescription}</h1>
                <p className="text-sm text-gray-600">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {/* Payment Button */}
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>Validate for $100</span>
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'overview', label: 'Overview', icon: FileText },
                { key: 'prototype', label: 'Prototype', icon: Wand2 },
                { key: 'landing', label: 'Landing Page', icon: Globe },
                { key: 'campaign', label: 'Campaign', icon: TrendingUp },
                { key: 'ab-testing', label: 'A/B Testing', icon: Zap },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
              <button
                onClick={() => setActiveTab('advanced-analytics')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'advanced-analytics'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Advanced Analytics
              </button>
              <button
                onClick={() => setActiveTab('ga4-analytics')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'ga4-analytics'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                GA4 Analytics
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Reports
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'billing'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-4 h-4 inline mr-2" />
                Billing
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Project Info */}
              <div className="lg:col-span-2 space-y-6">
            {/* Project Overview */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg ${status.bgColor}`}>
                  <StatusIcon className={`w-5 h-5 ${status.color}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{status.label}</h2>
                  <p className="text-sm text-gray-600">{status.description}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Business Idea</h3>
                  <p className="text-gray-700">{project.ideaDescription}</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Target Audience</h4>
                    <p className="text-gray-600">{project.targetAudience}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Price Point</h4>
                    <p className="text-gray-600">${project.pricePoint}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Prototype Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">AI-Generated Prototype</h2>
                {!prototype && (
                  <button
                    onClick={generatePrototype}
                    disabled={generatingPrototype}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>{generatingPrototype ? 'Generating...' : 'Generate Prototype'}</span>
                  </button>
                )}
              </div>
              
              {prototype ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Hero Copy</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{prototype.hero_copy}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Key Features</h3>
                    <div className="grid md:grid-cols-2 gap-2">
                      {JSON.parse(prototype.features_json || '[]').map((feature: string, index: number) => (
                        <div key={index} className="bg-gray-50 p-2 rounded-lg text-sm text-gray-700">
                          • {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Pricing Structure</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{prototype.pricing_structure}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No prototype generated yet</p>
                  <p className="text-sm">Click "Generate Prototype" to create AI-powered content</p>
                </div>
              )}
            </div>

            {/* Landing Page Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Landing Page</h2>
                {landingPage?.url && (
                  <a
                    href={landingPage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  >
                    <Globe className="w-4 h-4" />
                    <span>View Live</span>
                  </a>
                )}
              </div>
              
              {landingPage ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium">Live</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">URL:</span>
                    <span className="text-blue-600">{landingPage.url}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Landing page not created yet</p>
                  <p className="text-sm">Available after prototype generation</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Progress & Analytics */}
          <div className="space-y-6">
            {/* Progress Timeline */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Progress Timeline</h3>
              <div className="space-y-4">
                {Object.entries(statusConfig).map(([key, config], index) => {
                  const Icon = config.icon;
                  const isCompleted = Object.keys(statusConfig).indexOf(project.status) >= index;
                  const isCurrent = project.status === key;
                  
                  return (
                    <div key={key} className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        isCompleted ? config.bgColor : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          isCompleted ? config.color : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          isCurrent ? config.color : isCompleted ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {config.label}
                        </p>
                        <p className="text-xs text-gray-500">{config.description}</p>
                      </div>
                      {isCompleted && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Analytics Preview */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Analytics</h3>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              
              {analytics ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Page Views:</span>
                    <span className="text-sm font-medium">{analytics.page_views}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email Signups:</span>
                    <span className="text-sm font-medium">{analytics.email_signups}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Conversions:</span>
                    <span className="text-sm font-medium">{analytics.conversions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Demand Score:</span>
                    <span className="text-sm font-medium text-green-600">{analytics.demand_score}/100</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Analytics not available yet</p>
                </div>
              )}
            </div>

            {/* GitHub Repository */}
            {project.github_repo_url && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                      <Github className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">GitHub Repository</h3>
                      <p className="text-xs text-gray-600">{project.github_repo_name}</p>
                    </div>
                  </div>
                  <a
                    href={project.github_repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View</span>
                  </a>
                </div>
              </div>
            )}

            {/* GitHub Integration */}
            <GitHubIntegration 
              projectId={project.id} 
              onRepoCreated={() => {
                fetchProjectData();
              }}
            />

            {/* Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download Report</span>
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  Edit Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Other Tab Contents */}
    {activeTab === 'prototype' && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Prototype</h2>
        {prototype ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Hero Copy</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{prototype.hero_copy}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Key Features</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {JSON.parse(prototype.features_json || '[]').map((feature: string, index: number) => (
                  <div key={index} className="bg-gray-50 p-2 rounded-lg text-sm text-gray-700">
                    • {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No prototype generated yet</p>
            <button
              onClick={generatePrototype}
              disabled={generatingPrototype}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {generatingPrototype ? 'Generating...' : 'Generate Prototype'}
            </button>
          </div>
        )}
      </div>
    )}

    {activeTab === 'landing' && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Landing Page</h2>
        {landingPage ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Page Status: Live</h3>
                <p className="text-sm text-gray-600">Your landing page is deployed and collecting data</p>
              </div>
              <a
                href={landingPage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Globe className="w-4 h-4" />
                <span>View Page</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No landing page created yet</p>
            <p className="text-sm text-gray-400 mb-4">Generate a prototype first to create your landing page</p>
          </div>
        )}
      </div>
    )}

    {activeTab === 'campaign' && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Marketing Campaign</h2>
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Campaign management coming soon</p>
          <p className="text-sm text-gray-400">Launch targeted campaigns to validate market demand</p>
        </div>
      </div>
    )}

    {activeTab === 'analytics' && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Analytics</h2>
        {analytics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{analytics.page_views}</div>
              <div className="text-sm text-gray-600">Page Views</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{analytics.email_signups}</div>
              <div className="text-sm text-gray-600">Email Signups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{analytics.conversions}</div>
              <div className="text-sm text-gray-600">Conversions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.demand_score}/100</div>
              <div className="text-sm text-gray-600">Demand Score</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No analytics data available yet</p>
            <p className="text-sm text-gray-400">Data will appear once your landing page is live</p>
          </div>
        )}
      </div>
    )}

    {activeTab === 'advanced-analytics' && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <AdvancedAnalyticsDashboard projectId={project.id} />
      </div>
    )}

    {activeTab === 'ga4-analytics' && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <GA4AnalyticsDashboard 
          projectId={project.id} 
          landingPageUrl={landingPage?.url} 
        />
      </div>
    )}

    {activeTab === 'reports' && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ReportGenerator 
          projectId={project.id} 
          projectTitle={project.ideaDescription.substring(0, 50) + '...'} 
        />
      </div>
    )}

    {activeTab === 'ab-testing' && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ABTestManager projectId={project.id} />
      </div>
    )}

    {activeTab === 'billing' && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <BillingDashboard userId={project.userId} />
      </div>
    )}
  </div>

  {/* Payment Modal */}
  {showPaymentModal && (
    <PaymentModal
      isOpen={showPaymentModal}
      onClose={() => setShowPaymentModal(false)}
      projectId={project.id}
      projectTitle={project.ideaDescription}
    />
  )}
      </main>
    </div>
  );
}
