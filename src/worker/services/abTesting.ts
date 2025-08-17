export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage of traffic (0-100)
  config: {
    headline?: string;
    subheadline?: string;
    ctaText?: string;
    ctaColor?: string;
    pricing?: number;
    features?: string[];
    images?: string[];
    layout?: 'standard' | 'minimal' | 'detailed';
  };
}

export interface ABTest {
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
  results?: ABTestResults;
  createdAt: string;
  updatedAt: string;
}

export interface ABTestResults {
  totalVisitors: number;
  totalConversions: number;
  overallConversionRate: number;
  statisticalSignificance: number;
  confidenceLevel: number;
  winner?: string;
  variantResults: VariantResult[];
  insights: string[];
  recommendations: string[];
}

export interface VariantResult {
  variantId: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  improvement: number; // Percentage improvement over control
  significance: number;
}

export interface ABTestConfig {
  minSampleSize: number;
  maxDuration: number; // days
  significanceThreshold: number;
  confidenceLevel: number;
}

export class ABTestingService {
  private env: any;
  private config: ABTestConfig;

  constructor(env: any, config?: Partial<ABTestConfig>) {
    this.env = env;
    this.config = {
      minSampleSize: 100,
      maxDuration: 30,
      significanceThreshold: 0.95,
      confidenceLevel: 0.95,
      ...config
    };
  }

  /**
   * Create a new A/B test
   */
  async createABTest(test: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest> {
    const testId = this.generateTestId();
    const now = new Date().toISOString();

    // Validate variants weights sum to 100
    const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Variant weights must sum to 100%');
    }

    const abTest: ABTest = {
      ...test,
      id: testId,
      createdAt: now,
      updatedAt: now
    };

    // Store in database
    await this.env.DB.prepare(`
      INSERT INTO ab_tests (id, project_id, name, description, status, start_date, end_date, variants, metrics, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      abTest.id,
      abTest.projectId,
      abTest.name,
      abTest.description,
      abTest.status,
      abTest.startDate,
      abTest.endDate,
      JSON.stringify(abTest.variants),
      JSON.stringify(abTest.metrics),
      abTest.createdAt,
      abTest.updatedAt
    ).run();

    return abTest;
  }

  /**
   * Get A/B test by ID
   */
  async getABTest(testId: string): Promise<ABTest | null> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM ab_tests WHERE id = ?'
    ).bind(testId).first();

    if (!result) return null;

    return {
      id: result.id,
      projectId: result.project_id,
      name: result.name,
      description: result.description,
      status: result.status,
      startDate: result.start_date,
      endDate: result.end_date,
      variants: JSON.parse(result.variants),
      metrics: JSON.parse(result.metrics),
      results: result.results ? JSON.parse(result.results) : undefined,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  /**
   * Get all A/B tests for a project
   */
  async getProjectABTests(projectId: string): Promise<ABTest[]> {
    const results = await this.env.DB.prepare(
      'SELECT * FROM ab_tests WHERE project_id = ? ORDER BY created_at DESC'
    ).bind(projectId).all();

    return results.results.map((result: any) => ({
      id: result.id,
      projectId: result.project_id,
      name: result.name,
      description: result.description,
      status: result.status,
      startDate: result.start_date,
      endDate: result.end_date,
      variants: JSON.parse(result.variants),
      metrics: JSON.parse(result.metrics),
      results: result.results ? JSON.parse(result.results) : undefined,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    }));
  }

  /**
   * Assign visitor to a test variant
   */
  async assignVariant(testId: string, visitorId: string): Promise<ABTestVariant | null> {
    const test = await this.getABTest(testId);
    if (!test || test.status !== 'running') return null;

    // Check if visitor already assigned
    const existing = await this.env.DB.prepare(
      'SELECT variant_id FROM ab_test_assignments WHERE test_id = ? AND visitor_id = ?'
    ).bind(testId, visitorId).first();

    if (existing) {
      return test.variants.find(v => v.id === existing.variant_id) || null;
    }

    // Assign based on weights
    const random = Math.random() * 100;
    let cumulativeWeight = 0;
    let selectedVariant: ABTestVariant | null = null;

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        selectedVariant = variant;
        break;
      }
    }

    if (!selectedVariant) {
      selectedVariant = test.variants[0]; // Fallback to first variant
    }

    // Store assignment
    await this.env.DB.prepare(`
      INSERT INTO ab_test_assignments (test_id, visitor_id, variant_id, assigned_at)
      VALUES (?, ?, ?, ?)
    `).bind(testId, visitorId, selectedVariant.id, new Date().toISOString()).run();

    return selectedVariant;
  }

  /**
   * Track conversion event
   */
  async trackConversion(testId: string, visitorId: string, eventType: string, value?: number): Promise<void> {
    const assignment = await this.env.DB.prepare(
      'SELECT variant_id FROM ab_test_assignments WHERE test_id = ? AND visitor_id = ?'
    ).bind(testId, visitorId).first();

    if (!assignment) return;

    await this.env.DB.prepare(`
      INSERT INTO ab_test_events (test_id, visitor_id, variant_id, event_type, event_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      testId,
      visitorId,
      assignment.variant_id,
      eventType,
      value || 0,
      new Date().toISOString()
    ).run();
  }

  /**
   * Calculate A/B test results
   */
  async calculateResults(testId: string): Promise<ABTestResults> {
    const test = await this.getABTest(testId);
    if (!test) throw new Error('Test not found');

    // Get visitor counts per variant
    const visitorCounts = await this.env.DB.prepare(`
      SELECT variant_id, COUNT(DISTINCT visitor_id) as visitors
      FROM ab_test_assignments
      WHERE test_id = ?
      GROUP BY variant_id
    `).bind(testId).all();

    // Get conversion counts per variant
    const conversionCounts = await this.env.DB.prepare(`
      SELECT variant_id, COUNT(DISTINCT visitor_id) as conversions
      FROM ab_test_events
      WHERE test_id = ? AND event_type = ?
      GROUP BY variant_id
    `).bind(testId, test.metrics.primaryMetric).all();

    const variantResults: VariantResult[] = [];
    let totalVisitors = 0;
    let totalConversions = 0;

    // Calculate results for each variant
    for (const variant of test.variants) {
      const visitors = visitorCounts.results.find((v: any) => v.variant_id === variant.id)?.visitors || 0;
      const conversions = conversionCounts.results.find((c: any) => c.variant_id === variant.id)?.conversions || 0;
      const conversionRate = visitors > 0 ? (conversions / visitors) * 100 : 0;

      // Calculate confidence interval (simplified)
      const margin = this.calculateMarginOfError(conversions, visitors, this.config.confidenceLevel);
      
      variantResults.push({
        variantId: variant.id,
        visitors,
        conversions,
        conversionRate,
        confidenceInterval: {
          lower: Math.max(0, conversionRate - margin),
          upper: Math.min(100, conversionRate + margin)
        },
        improvement: 0, // Will be calculated relative to control
        significance: 0 // Will be calculated
      });

      totalVisitors += visitors;
      totalConversions += conversions;
    }

    // Calculate improvements relative to control (first variant)
    const controlResult = variantResults[0];
    if (controlResult) {
      variantResults.forEach(result => {
        if (result.variantId !== controlResult.variantId) {
          result.improvement = controlResult.conversionRate > 0 
            ? ((result.conversionRate - controlResult.conversionRate) / controlResult.conversionRate) * 100
            : 0;
          result.significance = this.calculateStatisticalSignificance(
            result.conversions, result.visitors,
            controlResult.conversions, controlResult.visitors
          );
        }
      });
    }

    // Determine winner
    const winner = this.determineWinner(variantResults);
    const overallConversionRate = totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0;

    const results: ABTestResults = {
      totalVisitors,
      totalConversions,
      overallConversionRate,
      statisticalSignificance: Math.max(...variantResults.map(r => r.significance)),
      confidenceLevel: this.config.confidenceLevel,
      winner: winner?.variantId,
      variantResults,
      insights: this.generateInsights(variantResults, test),
      recommendations: this.generateRecommendations(variantResults, test)
    };

    // Update test with results
    await this.env.DB.prepare(
      'UPDATE ab_tests SET results = ?, updated_at = ? WHERE id = ?'
    ).bind(JSON.stringify(results), new Date().toISOString(), testId).run();

    return results;
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE ab_tests SET status = "running", start_date = ?, updated_at = ? WHERE id = ?'
    ).bind(new Date().toISOString(), new Date().toISOString(), testId).run();
  }

  /**
   * Stop an A/B test
   */
  async stopTest(testId: string): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE ab_tests SET status = "completed", end_date = ?, updated_at = ? WHERE id = ?'
    ).bind(new Date().toISOString(), new Date().toISOString(), testId).run();
  }

  /**
   * Pause an A/B test
   */
  async pauseTest(testId: string): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE ab_tests SET status = "paused", updated_at = ? WHERE id = ?'
    ).bind(new Date().toISOString(), testId).run();
  }

  // Private helper methods

  private generateTestId(): string {
    return 'test_' + Math.random().toString(36).substr(2, 9);
  }

  private calculateMarginOfError(conversions: number, visitors: number, confidenceLevel: number): number {
    if (visitors === 0) return 0;
    
    const p = conversions / visitors;
    const z = confidenceLevel === 0.95 ? 1.96 : 2.58; // 95% or 99%
    const margin = z * Math.sqrt((p * (1 - p)) / visitors);
    
    return margin * 100; // Convert to percentage
  }

  private calculateStatisticalSignificance(
    conversionsA: number, visitorsA: number,
    conversionsB: number, visitorsB: number
  ): number {
    if (visitorsA === 0 || visitorsB === 0) return 0;

    const pA = conversionsA / visitorsA;
    const pB = conversionsB / visitorsB;
    const pPool = (conversionsA + conversionsB) / (visitorsA + visitorsB);
    
    const se = Math.sqrt(pPool * (1 - pPool) * (1/visitorsA + 1/visitorsB));
    const z = Math.abs(pA - pB) / se;
    
    // Convert z-score to confidence level (simplified)
    return Math.min(0.99, Math.max(0, (z - 1.96) / 2.58));
  }

  private determineWinner(results: VariantResult[]): VariantResult | null {
    if (results.length < 2) return null;

    // Find variant with highest conversion rate and sufficient significance
    const significantResults = results.filter(r => r.significance >= this.config.significanceThreshold);
    if (significantResults.length === 0) return null;

    return significantResults.reduce((winner, current) => 
      current.conversionRate > winner.conversionRate ? current : winner
    );
  }

  private generateInsights(results: VariantResult[], test: ABTest): string[] {
    const insights: string[] = [];
    
    const bestVariant = results.reduce((best, current) => 
      current.conversionRate > best.conversionRate ? current : best
    );
    
    const worstVariant = results.reduce((worst, current) => 
      current.conversionRate < worst.conversionRate ? current : worst
    );

    if (bestVariant.conversionRate > worstVariant.conversionRate) {
      insights.push(`Best performing variant achieved ${bestVariant.conversionRate.toFixed(2)}% conversion rate`);
      insights.push(`Performance gap of ${(bestVariant.conversionRate - worstVariant.conversionRate).toFixed(2)}% between best and worst variants`);
    }

    const totalSampleSize = results.reduce((sum, r) => sum + r.visitors, 0);
    if (totalSampleSize < this.config.minSampleSize) {
      insights.push(`Sample size (${totalSampleSize}) is below recommended minimum (${this.config.minSampleSize})`);
    }

    return insights;
  }

  private generateRecommendations(results: VariantResult[], test: ABTest): string[] {
    const recommendations: string[] = [];
    
    const winner = this.determineWinner(results);
    if (winner) {
      recommendations.push(`Implement winning variant (${winner.variantId}) for ${winner.improvement.toFixed(1)}% improvement`);
    } else {
      recommendations.push('Continue testing to reach statistical significance');
    }

    const totalSampleSize = results.reduce((sum, r) => sum + r.visitors, 0);
    if (totalSampleSize < this.config.minSampleSize) {
      recommendations.push('Increase traffic or extend test duration to reach minimum sample size');
    }

    return recommendations;
  }
}
