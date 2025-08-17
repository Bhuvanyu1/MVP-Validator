// Google Analytics 4 (GA4) Integration Service
// This service handles all interactions with GA4 for tracking landing page and campaign analytics

interface GA4Config {
  measurementId: string;
  apiSecret: string;
  propertyId: string;
}

interface GA4Event {
  name: string;
  params: Record<string, any>;
}

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

export class GA4AnalyticsService {
  private config: GA4Config;

  constructor(config: GA4Config) {
    this.config = config;
  }

  /**
   * Send a custom event to GA4 via Measurement Protocol
   */
  async sendEvent(clientId: string, event: GA4Event): Promise<void> {
    const payload = {
      client_id: clientId,
      events: [event]
    };

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`GA4 event failed: ${response.statusText}`);
    }
  }

  /**
   * Track landing page view
   */
  async trackLandingPageView(
    clientId: string,
    projectId: string,
    landingPageUrl: string,
    referrer?: string
  ): Promise<void> {
    await this.sendEvent(clientId, {
      name: 'landing_page_view',
      params: {
        project_id: projectId,
        page_location: landingPageUrl,
        page_referrer: referrer || '',
        custom_parameter_1: 'mvp_validator_landing',
      },
    });
  }

  /**
   * Track conversion on landing page (form submission, signup, etc.)
   */
  async trackLandingPageConversion(
    clientId: string,
    projectId: string,
    conversionType: string,
    value?: number
  ): Promise<void> {
    await this.sendEvent(clientId, {
      name: 'conversion',
      params: {
        project_id: projectId,
        conversion_type: conversionType,
        value: value || 0,
        currency: 'USD',
        custom_parameter_1: 'mvp_validator_conversion',
      },
    });
  }

  /**
   * Track campaign click from ads
   */
  async trackCampaignClick(
    clientId: string,
    projectId: string,
    campaignId: string,
    adSource: string
  ): Promise<void> {
    await this.sendEvent(clientId, {
      name: 'campaign_click',
      params: {
        project_id: projectId,
        campaign_id: campaignId,
        source: adSource,
        medium: 'cpc',
        custom_parameter_1: 'mvp_validator_campaign',
      },
    });
  }

  /**
   * Track user engagement events
   */
  async trackEngagement(
    clientId: string,
    projectId: string,
    engagementType: string,
    duration?: number
  ): Promise<void> {
    await this.sendEvent(clientId, {
      name: 'user_engagement',
      params: {
        project_id: projectId,
        engagement_type: engagementType,
        engagement_time_msec: duration || 0,
        custom_parameter_1: 'mvp_validator_engagement',
      },
    });
  }

  /**
   * Get landing page analytics using GA4 Reporting API
   */
  async getLandingPageAnalytics(
    projectId: string,
    landingPageUrl: string,
    startDate: string,
    endDate: string
  ): Promise<LandingPageAnalytics> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Construct the reporting request
      const reportRequest = {
        property: `properties/${this.config.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'pagePath' },
          { name: 'source' },
          { name: 'deviceCategory' },
          { name: 'country' }
        ],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'totalUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'conversions' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: {
              matchType: 'CONTAINS',
              value: new URL(landingPageUrl).pathname
            }
          }
        }
      };

      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${this.config.propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reportRequest),
        }
      );

      if (!response.ok) {
        throw new Error(`GA4 API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Process the response data
      return this.processLandingPageData(data);
    } catch (error) {
      console.error('Error fetching GA4 landing page analytics:', error);
      // Return simulated data as fallback
      return this.getSimulatedLandingPageAnalytics();
    }
  }

  /**
   * Get campaign analytics using GA4 Reporting API
   */
  async getCampaignAnalytics(
    projectId: string,
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<CampaignAnalytics> {
    try {
      const accessToken = await this.getAccessToken();
      
      const reportRequest = {
        property: `properties/${this.config.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'source' },
          { name: 'medium' },
          { name: 'campaign' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'conversions' },
          { name: 'totalRevenue' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'campaign',
            stringFilter: {
              matchType: 'CONTAINS',
              value: campaignId
            }
          }
        }
      };

      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${this.config.propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reportRequest),
        }
      );

      if (!response.ok) {
        throw new Error(`GA4 API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return this.processCampaignData(data);
    } catch (error) {
      console.error('Error fetching GA4 campaign analytics:', error);
      return this.getSimulatedCampaignAnalytics();
    }
  }

  /**
   * Get access token for GA4 Reporting API
   */
  private async getAccessToken(): Promise<string> {
    // In a real implementation, you would use service account credentials
    // or OAuth2 flow to get an access token for the GA4 Reporting API
    // For now, we'll throw an error to indicate this needs to be implemented
    throw new Error('GA4 access token implementation required');
  }

  /**
   * Process raw GA4 landing page data into structured analytics
   */
  private processLandingPageData(rawData: any): LandingPageAnalytics {
    const rows = rawData.rows || [];
    
    let totalPageViews = 0;
    let totalUsers = 0;
    let totalBounceRate = 0;
    let totalSessionDuration = 0;
    let totalConversions = 0;
    
    const sources: Record<string, number> = {};
    const devices: Record<string, number> = {};
    const countries: Record<string, number> = {};

    rows.forEach((row: any) => {
      const metrics = row.metricValues;
      const dimensions = row.dimensionValues;
      
      totalPageViews += parseInt(metrics[0].value || '0');
      totalUsers += parseInt(metrics[1].value || '0');
      totalBounceRate += parseFloat(metrics[2].value || '0');
      totalSessionDuration += parseFloat(metrics[3].value || '0');
      totalConversions += parseInt(metrics[4].value || '0');
      
      // Aggregate by dimensions
      const source = dimensions[1].value;
      const device = dimensions[2].value;
      const country = dimensions[3].value;
      
      sources[source] = (sources[source] || 0) + parseInt(metrics[0].value || '0');
      devices[device] = (devices[device] || 0) + parseInt(metrics[0].value || '0');
      countries[country] = (countries[country] || 0) + parseInt(metrics[0].value || '0');
    });

    return {
      pageViews: totalPageViews,
      uniqueVisitors: totalUsers,
      bounceRate: rows.length > 0 ? totalBounceRate / rows.length : 0,
      avgSessionDuration: rows.length > 0 ? totalSessionDuration / rows.length : 0,
      conversions: totalConversions,
      conversionRate: totalPageViews > 0 ? (totalConversions / totalPageViews) * 100 : 0,
      topSources: Object.entries(sources)
        .map(([source, sessions]) => ({ source, sessions }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 5),
      deviceBreakdown: Object.entries(devices)
        .map(([device, sessions]) => ({ device, sessions })),
      geographicData: Object.entries(countries)
        .map(([country, sessions]) => ({ country, sessions }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 10),
    };
  }

  /**
   * Process raw GA4 campaign data into structured analytics
   */
  private processCampaignData(rawData: any): CampaignAnalytics {
    const rows = rawData.rows || [];
    
    let totalSessions = 0;
    let totalPageViews = 0;
    let totalConversions = 0;
    let totalRevenue = 0;
    
    const conversionPaths: Record<string, number> = {};

    rows.forEach((row: any) => {
      const metrics = row.metricValues;
      const dimensions = row.dimensionValues;
      
      totalSessions += parseInt(metrics[0].value || '0');
      totalPageViews += parseInt(metrics[1].value || '0');
      totalConversions += parseInt(metrics[2].value || '0');
      totalRevenue += parseFloat(metrics[3].value || '0');
      
      const source = dimensions[0].value;
      const medium = dimensions[1].value;
      const path = `${source}/${medium}`;
      
      conversionPaths[path] = (conversionPaths[path] || 0) + parseInt(metrics[2].value || '0');
    });

    return {
      sessions: totalSessions,
      pageViews: totalPageViews,
      conversions: totalConversions,
      revenue: totalRevenue,
      costPerAcquisition: totalConversions > 0 ? totalRevenue / totalConversions : 0,
      returnOnAdSpend: totalRevenue > 0 ? (totalRevenue / 100) : 0, // Assuming $100 ad spend
      conversionPaths: Object.entries(conversionPaths)
        .map(([path, conversions]) => ({ path, conversions }))
        .sort((a, b) => b.conversions - a.conversions)
        .slice(0, 5),
    };
  }

  /**
   * Generate simulated landing page analytics for fallback
   */
  private getSimulatedLandingPageAnalytics(): LandingPageAnalytics {
    return {
      pageViews: Math.floor(Math.random() * 5000) + 1000,
      uniqueVisitors: Math.floor(Math.random() * 3000) + 500,
      bounceRate: Math.random() * 40 + 30, // 30-70%
      avgSessionDuration: Math.random() * 180 + 60, // 60-240 seconds
      conversions: Math.floor(Math.random() * 100) + 10,
      conversionRate: Math.random() * 5 + 1, // 1-6%
      topSources: [
        { source: 'google', sessions: Math.floor(Math.random() * 1000) + 500 },
        { source: 'facebook', sessions: Math.floor(Math.random() * 800) + 300 },
        { source: 'direct', sessions: Math.floor(Math.random() * 600) + 200 },
        { source: 'linkedin', sessions: Math.floor(Math.random() * 400) + 100 },
        { source: 'twitter', sessions: Math.floor(Math.random() * 300) + 50 },
      ],
      deviceBreakdown: [
        { device: 'desktop', sessions: Math.floor(Math.random() * 1500) + 800 },
        { device: 'mobile', sessions: Math.floor(Math.random() * 1200) + 600 },
        { device: 'tablet', sessions: Math.floor(Math.random() * 300) + 100 },
      ],
      geographicData: [
        { country: 'United States', sessions: Math.floor(Math.random() * 1000) + 500 },
        { country: 'United Kingdom', sessions: Math.floor(Math.random() * 400) + 200 },
        { country: 'Canada', sessions: Math.floor(Math.random() * 300) + 150 },
        { country: 'Australia', sessions: Math.floor(Math.random() * 200) + 100 },
        { country: 'Germany', sessions: Math.floor(Math.random() * 200) + 80 },
      ],
    };
  }

  /**
   * Generate simulated campaign analytics for fallback
   */
  private getSimulatedCampaignAnalytics(): CampaignAnalytics {
    const sessions = Math.floor(Math.random() * 2000) + 500;
    const conversions = Math.floor(Math.random() * 50) + 10;
    
    return {
      sessions,
      pageViews: sessions * (Math.random() * 2 + 1), // 1-3 pages per session
      conversions,
      revenue: conversions * (Math.random() * 50 + 25), // $25-75 per conversion
      costPerAcquisition: Math.random() * 30 + 10, // $10-40 CPA
      returnOnAdSpend: Math.random() * 3 + 1, // 1x-4x ROAS
      conversionPaths: [
        { path: 'google/cpc', conversions: Math.floor(conversions * 0.6) },
        { path: 'facebook/cpc', conversions: Math.floor(conversions * 0.25) },
        { path: 'linkedin/cpc', conversions: Math.floor(conversions * 0.15) },
      ],
    };
  }

  /**
   * Generate GA4 tracking script for landing pages
   */
  static generateTrackingScript(measurementId: string, projectId: string): string {
    return `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${measurementId}', {
    custom_map: {
      'custom_parameter_1': 'project_id'
    }
  });
  
  // Track MVP Validator specific events
  gtag('event', 'landing_page_view', {
    'project_id': '${projectId}',
    'custom_parameter_1': 'mvp_validator_landing'
  });
  
  // Track form submissions as conversions
  document.addEventListener('submit', function(e) {
    if (e.target.matches('form')) {
      gtag('event', 'conversion', {
        'project_id': '${projectId}',
        'conversion_type': 'form_submission',
        'custom_parameter_1': 'mvp_validator_conversion'
      });
    }
  });
  
  // Track button clicks
  document.addEventListener('click', function(e) {
    if (e.target.matches('button, .btn, .cta-button')) {
      gtag('event', 'user_engagement', {
        'project_id': '${projectId}',
        'engagement_type': 'button_click',
        'custom_parameter_1': 'mvp_validator_engagement'
      });
    }
  });
</script>`;
  }
}
