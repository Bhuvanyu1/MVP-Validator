import { useState, useEffect } from 'react';
import { Play, Pause, BarChart3, DollarSign, Eye, Users, TrendingUp, AlertCircle, Settings, Edit3, Target, Calendar } from 'lucide-react';

interface CampaignManagerProps {
  projectId: string;
  landingPage: any;
  onCampaignUpdate: (campaign: any) => void;
}

interface CampaignData {
  id?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget: number;
  platform: 'google' | 'meta' | 'linkedin';
  startDate?: string;
  endDate?: string;
  adCopy?: {
    headline: string;
    description: string;
    callToAction: string;
  };
  targeting?: {
    keywords: string[];
    demographics: string;
    locations: string[];
  };
  metrics?: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpa: number;
  };
}

export default function CampaignManager({ projectId, landingPage, onCampaignUpdate }: CampaignManagerProps) {
  const [campaign, setCampaign] = useState<CampaignData>({
    status: 'draft',
    budget: 70, // $70 for ads as per PRD
    platform: 'google',
    adCopy: {
      headline: '',
      description: '',
      callToAction: 'Learn More'
    },
    targeting: {
      keywords: [],
      demographics: 'All ages',
      locations: ['United States']
    }
  });
  const [isLaunching, setIsLaunching] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showCampaignSetup, setShowCampaignSetup] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    fetchCampaignData();
  }, [projectId]);

  const fetchCampaignData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/campaign`);
      if (response.ok) {
        const campaignData = await response.json();
        setCampaign(campaignData);
        setShowMetrics(campaignData.status === 'active' || campaignData.status === 'completed');
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
    }
  };

  const launchCampaign = async () => {
    if (!landingPage) {
      alert('Please create a landing page first');
      return;
    }

    setIsLaunching(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/launch-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: campaign.budget,
          platform: campaign.platform,
          landingPageUrl: landingPage.url
        })
      });

      if (response.ok) {
        const updatedCampaign = await response.json();
        setCampaign(updatedCampaign);
        setShowMetrics(true);
        onCampaignUpdate(updatedCampaign);
      }
    } catch (error) {
      console.error('Error launching campaign:', error);
    } finally {
      setIsLaunching(false);
    }
  };

  const pauseCampaign = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/pause-campaign`, {
        method: 'POST'
      });

      if (response.ok) {
        const updatedCampaign = await response.json();
        setCampaign(updatedCampaign);
        onCampaignUpdate(updatedCampaign);
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const calculateDemandScore = () => {
    if (!campaign.metrics) return 0;
    const { clicks, conversions, ctr } = campaign.metrics;
    
    // Simple demand scoring algorithm based on PRD
    let score = 0;
    if (ctr > 2) score += 30; // Good CTR
    if (conversions > 10) score += 40; // Good conversion count
    if (clicks > 100) score += 30; // Good traffic
    
    return Math.min(score, 100);
  };

  const addKeyword = () => {
    if (newKeyword.trim() && campaign.targeting) {
      setCampaign(prev => ({
        ...prev,
        targeting: {
          ...prev.targeting!,
          keywords: [...prev.targeting!.keywords, newKeyword.trim()]
        }
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    if (campaign.targeting) {
      setCampaign(prev => ({
        ...prev,
        targeting: {
          ...prev.targeting!,
          keywords: prev.targeting!.keywords.filter((_, i) => i !== index)
        }
      }));
    }
  };

  const updateAdCopy = (field: string, value: string) => {
    setCampaign(prev => ({
      ...prev,
      adCopy: {
        ...prev.adCopy!,
        [field]: value
      }
    }));
  };

  const saveCampaignSettings = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/campaign/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: campaign.budget,
          platform: campaign.platform,
          adCopy: campaign.adCopy,
          targeting: campaign.targeting
        })
      });

      if (response.ok) {
        const updatedCampaign = await response.json();
        setCampaign(updatedCampaign);
        onCampaignUpdate(updatedCampaign);
      }
    } catch (error) {
      console.error('Error saving campaign settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold">Campaign Management</h3>
            <p className="text-gray-600">Launch and monitor your validation campaign</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </div>
        </div>

        {/* Campaign Controls */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Budget:</label>
              <input
                type="number"
                value={campaign.budget}
                onChange={(e) => setCampaign(prev => ({ ...prev, budget: Number(e.target.value) }))}
                className="w-20 px-2 py-1 border rounded text-sm"
                min="10"
                max="500"
              />
              <span className="text-sm text-gray-600">USD</span>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Platform:</label>
              <select
                value={campaign.platform}
                onChange={(e) => setCampaign(prev => ({ ...prev, platform: e.target.value as 'google' | 'meta' | 'linkedin' }))}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="google">Google Ads</option>
                <option value="meta">Meta Ads</option>
                <option value="linkedin">LinkedIn Ads</option>
              </select>
            </div>

            <button
              onClick={() => setShowCampaignSetup(!showCampaignSetup)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <Settings className="w-4 h-4" />
              Campaign Settings
            </button>
          </div>

          {/* Advanced Campaign Setup */}
          {showCampaignSetup && (
            <div className="border-t pt-4 space-y-6">
              {/* Ad Copy Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Ad Copy
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Headline</label>
                    <input
                      type="text"
                      value={campaign.adCopy?.headline || ''}
                      onChange={(e) => updateAdCopy('headline', e.target.value)}
                      placeholder="Enter compelling headline (max 30 chars)"
                      maxLength={30}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={campaign.adCopy?.description || ''}
                      onChange={(e) => updateAdCopy('description', e.target.value)}
                      placeholder="Describe your product/service (max 90 chars)"
                      maxLength={90}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Call to Action</label>
                    <select
                      value={campaign.adCopy?.callToAction || 'Learn More'}
                      onChange={(e) => updateAdCopy('callToAction', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="Learn More">Learn More</option>
                      <option value="Get Started">Get Started</option>
                      <option value="Sign Up">Sign Up</option>
                      <option value="Try Now">Try Now</option>
                      <option value="Download">Download</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Targeting Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Targeting
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Keywords</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Add keyword"
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                      />
                      <button
                        onClick={addKeyword}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {campaign.targeting?.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                        >
                          {keyword}
                          <button
                            onClick={() => removeKeyword(index)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Demographics</label>
                    <select
                      value={campaign.targeting?.demographics || 'All ages'}
                      onChange={(e) => setCampaign(prev => ({
                        ...prev,
                        targeting: {
                          ...prev.targeting!,
                          demographics: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="All ages">All ages</option>
                      <option value="18-24">18-24 years</option>
                      <option value="25-34">25-34 years</option>
                      <option value="35-44">35-44 years</option>
                      <option value="45-54">45-54 years</option>
                      <option value="55+">55+ years</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveCampaignSettings}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  Save Settings
                </button>
                <button
                  onClick={() => setShowCampaignSetup(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {campaign.status === 'draft' && (
              <button
                onClick={launchCampaign}
                disabled={isLaunching || !landingPage}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {isLaunching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Launch Campaign
                  </>
                )}
              </button>
            )}

            {campaign.status === 'active' && (
              <button
                onClick={pauseCampaign}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center gap-2 text-sm"
              >
                <Pause className="w-4 h-4" />
                Pause Campaign
              </button>
            )}

            {!landingPage && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Create a landing page first</span>
              </div>
            )}
          </div>
        </div>

        {/* Campaign Metrics */}
        {showMetrics && campaign.metrics && (
          <div className="border-t pt-6">
            <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Campaign Performance
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Impressions</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {campaign.metrics.impressions.toLocaleString()}
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Clicks</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {campaign.metrics.clicks.toLocaleString()}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Conversions</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {campaign.metrics.conversions}
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">Spend</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  ${campaign.metrics.spend.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Click-Through Rate</div>
                <div className="text-lg font-semibold">{campaign.metrics.ctr.toFixed(2)}%</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Cost Per Acquisition</div>
                <div className="text-lg font-semibold">${campaign.metrics.cpa.toFixed(2)}</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Demand Score</div>
                <div className="text-lg font-semibold">{calculateDemandScore()}/100</div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Timeline */}
        {campaign.startDate && (
          <div className="border-t pt-6 mt-6">
            <h4 className="text-md font-semibold mb-4">Campaign Timeline</h4>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Started:</span> {new Date(campaign.startDate).toLocaleDateString()}
              </div>
              {campaign.endDate && (
                <div>
                  <span className="font-medium">Ends:</span> {new Date(campaign.endDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
