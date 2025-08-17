// Google Ads API Integration Service
// This service handles all interactions with the Google Ads API

interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  customerId: string;
}

interface CampaignData {
  name: string;
  budget: number;
  targetingKeywords: string[];
  landingPageUrl: string;
  adCopy: {
    headlines: string[];
    descriptions: string[];
  };
}

interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpa: number;
  conversionRate: number;
}

export class GoogleAdsService {
  private config: GoogleAdsConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: GoogleAdsConfig) {
    this.config = config;
  }

  /**
   * Get a valid access token for Google Ads API
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

    return this.accessToken;
  }

  /**
   * Make authenticated request to Google Ads API
   */
  private async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`https://googleads.googleapis.com/v16/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': this.config.developerToken,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Ads API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a new Google Ads campaign
   */
  async createCampaign(campaignData: CampaignData): Promise<string> {
    const campaignResource = {
      campaign: {
        name: campaignData.name,
        status: 'ENABLED',
        advertisingChannelType: 'SEARCH',
        biddingStrategyType: 'TARGET_CPA',
        campaignBudget: await this.createBudget(campaignData.budget),
        targetCpa: {
          targetCpaMicros: Math.round(campaignData.budget * 0.1 * 1000000), // 10% of budget as target CPA
        },
        networkSettings: {
          targetGoogleSearch: true,
          targetSearchNetwork: true,
          targetContentNetwork: false,
          targetPartnerSearchNetwork: false,
        },
      },
    };

    const response = await this.makeRequest(
      `customers/${this.config.customerId}/campaigns:mutate`,
      'POST',
      {
        operations: [{
          create: campaignResource.campaign,
        }],
      }
    );

    const campaignId = response.results[0].resourceName.split('/').pop();
    
    // Create ad group and ads
    await this.createAdGroup(campaignId, campaignData);
    
    return campaignId;
  }

  /**
   * Create campaign budget
   */
  private async createBudget(budgetAmount: number): Promise<string> {
    const budgetResource = {
      campaignBudget: {
        name: `Budget_${Date.now()}`,
        amountMicros: budgetAmount * 1000000, // Convert to micros
        deliveryMethod: 'STANDARD',
      },
    };

    const response = await this.makeRequest(
      `customers/${this.config.customerId}/campaignBudgets:mutate`,
      'POST',
      {
        operations: [{
          create: budgetResource.campaignBudget,
        }],
      }
    );

    return response.results[0].resourceName;
  }

  /**
   * Create ad group with keywords and ads
   */
  private async createAdGroup(campaignId: string, campaignData: CampaignData): Promise<void> {
    // Create ad group
    const adGroupResource = {
      adGroup: {
        name: `AdGroup_${Date.now()}`,
        campaign: `customers/${this.config.customerId}/campaigns/${campaignId}`,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpcBidMicros: 2000000, // $2 default bid
      },
    };

    const adGroupResponse = await this.makeRequest(
      `customers/${this.config.customerId}/adGroups:mutate`,
      'POST',
      {
        operations: [{
          create: adGroupResource.adGroup,
        }],
      }
    );

    const adGroupId = adGroupResponse.results[0].resourceName.split('/').pop();

    // Add keywords
    await this.addKeywords(adGroupId, campaignData.targetingKeywords);

    // Create responsive search ads
    await this.createResponsiveSearchAd(adGroupId, campaignData);
  }

  /**
   * Add keywords to ad group
   */
  private async addKeywords(adGroupId: string, keywords: string[]): Promise<void> {
    const operations = keywords.map(keyword => ({
      create: {
        adGroupCriterion: {
          adGroup: `customers/${this.config.customerId}/adGroups/${adGroupId}`,
          status: 'ENABLED',
          keyword: {
            text: keyword,
            matchType: 'BROAD',
          },
          cpcBidMicros: 2000000, // $2 bid
        },
      },
    }));

    await this.makeRequest(
      `customers/${this.config.customerId}/adGroupCriteria:mutate`,
      'POST',
      { operations }
    );
  }

  /**
   * Create responsive search ad
   */
  private async createResponsiveSearchAd(adGroupId: string, campaignData: CampaignData): Promise<void> {
    const adResource = {
      ad: {
        responsiveSearchAd: {
          headlines: campaignData.adCopy.headlines.map(headline => ({
            text: headline,
          })),
          descriptions: campaignData.adCopy.descriptions.map(description => ({
            text: description,
          })),
        },
        finalUrls: [campaignData.landingPageUrl],
      },
      adGroup: `customers/${this.config.customerId}/adGroups/${adGroupId}`,
      status: 'ENABLED',
    };

    await this.makeRequest(
      `customers/${this.config.customerId}/adGroupAds:mutate`,
      'POST',
      {
        operations: [{
          create: adResource,
        }],
      }
    );
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(campaignId: string, startDate: string, endDate: string): Promise<CampaignMetrics> {
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr,
        metrics.cost_per_conversion
      FROM campaign 
      WHERE campaign.id = ${campaignId}
      AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;

    const response = await this.makeRequest(
      `customers/${this.config.customerId}/googleAds:searchStream`,
      'POST',
      { query }
    );

    const results = response.results || [];
    
    if (results.length === 0) {
      return {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        ctr: 0,
        cpa: 0,
        conversionRate: 0,
      };
    }

    const metrics = results[0].metrics;
    const spend = (metrics.costMicros || 0) / 1000000; // Convert from micros
    const conversions = metrics.conversions || 0;
    const clicks = metrics.clicks || 0;

    return {
      impressions: metrics.impressions || 0,
      clicks,
      conversions,
      spend,
      ctr: metrics.ctr || 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    };
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    await this.makeRequest(
      `customers/${this.config.customerId}/campaigns:mutate`,
      'POST',
      {
        operations: [{
          update: {
            resourceName: `customers/${this.config.customerId}/campaigns/${campaignId}`,
            status: 'PAUSED',
          },
          updateMask: 'status',
        }],
      }
    );
  }

  /**
   * Resume a campaign
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    await this.makeRequest(
      `customers/${this.config.customerId}/campaigns:mutate`,
      'POST',
      {
        operations: [{
          update: {
            resourceName: `customers/${this.config.customerId}/campaigns/${campaignId}`,
            status: 'ENABLED',
          },
          updateMask: 'status',
        }],
      }
    );
  }

  /**
   * Generate targeting keywords based on business idea
   */
  static generateKeywords(businessIdea: string, targetAudience: string): string[] {
    // This would ideally use AI to generate relevant keywords
    // For now, we'll create basic keywords from the business idea
    const words = businessIdea.toLowerCase().split(' ');
    const audienceWords = targetAudience.toLowerCase().split(' ');
    
    const keywords = [
      ...words.filter(word => word.length > 3),
      ...audienceWords.filter(word => word.length > 3),
      `${words[0]} ${words[1] || ''}`.trim(),
      `${words[0]} solution`,
      `${words[0]} service`,
      `${words[0]} tool`,
    ];

    return [...new Set(keywords)].slice(0, 20); // Remove duplicates and limit to 20
  }

  /**
   * Generate ad copy based on prototype data
   */
  static generateAdCopy(heroCopy: string, valueProposition: string): { headlines: string[]; descriptions: string[] } {
    const headlines = [
      heroCopy,
      `${heroCopy} - Get Started Today`,
      `Transform Your Business with ${heroCopy}`,
      `${heroCopy} - Free Trial Available`,
      `Discover ${heroCopy}`,
    ].filter(h => h.length <= 30).slice(0, 3); // Google Ads headline limit

    const descriptions = [
      valueProposition,
      `${valueProposition} Start your free trial today.`,
      `Join thousands who trust our solution. ${valueProposition}`,
    ].filter(d => d.length <= 90).slice(0, 2); // Google Ads description limit

    return { headlines, descriptions };
  }
}
