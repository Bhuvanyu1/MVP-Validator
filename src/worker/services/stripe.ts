// Stripe Payment Processing Service
// This service handles all Stripe payment operations for the MVP Validator platform

interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

interface PaymentIntentData {
  amount: number; // Amount in cents
  currency: string;
  description: string;
  metadata: Record<string, string>;
}

interface CheckoutSessionData {
  priceId?: string;
  amount?: number; // Amount in cents
  currency?: string;
  productName: string;
  productDescription: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata: Record<string, string>;
}

interface SubscriptionData {
  customerId: string;
  priceId: string;
  metadata: Record<string, string>;
}

interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
}

interface CheckoutResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export class StripeService {
  private config: StripeConfig;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(config: StripeConfig) {
    this.config = config;
  }

  /**
   * Create a payment intent for one-time payments
   */
  async createPaymentIntent(data: PaymentIntentData): Promise<PaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/payment_intents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: data.amount.toString(),
          currency: data.currency,
          description: data.description,
          'automatic_payment_methods[enabled]': 'true',
          ...this.formatMetadata(data.metadata),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Payment intent creation failed');
      }

      const paymentIntent = await response.json();
      
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a Checkout Session for hosted payment page
   */
  async createCheckoutSession(data: CheckoutSessionData): Promise<CheckoutResult> {
    try {
      const lineItems = data.priceId 
        ? [{ price: data.priceId, quantity: 1 }]
        : [{
            price_data: {
              currency: data.currency || 'usd',
              product_data: {
                name: data.productName,
                description: data.productDescription,
              },
              unit_amount: data.amount || 10000, // Default $100
            },
            quantity: 1,
          }];

      const params = new URLSearchParams({
        'mode': 'payment',
        'success_url': data.successUrl,
        'cancel_url': data.cancelUrl,
        ...this.formatMetadata(data.metadata),
      });

      // Add line items
      lineItems.forEach((item, index) => {
        if ('price' in item) {
          params.append(`line_items[${index}][price]`, item.price);
          params.append(`line_items[${index}][quantity]`, item.quantity.toString());
        } else {
          params.append(`line_items[${index}][price_data][currency]`, item.price_data.currency);
          params.append(`line_items[${index}][price_data][product_data][name]`, item.price_data.product_data.name);
          params.append(`line_items[${index}][price_data][product_data][description]`, item.price_data.product_data.description);
          params.append(`line_items[${index}][price_data][unit_amount]`, item.price_data.unit_amount.toString());
          params.append(`line_items[${index}][quantity]`, item.quantity.toString());
        }
      });

      if (data.customerEmail) {
        params.append('customer_email', data.customerEmail);
      }

      const response = await fetch(`${this.baseUrl}/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Checkout session creation failed');
      }

      const session = await response.json();
      
      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Retrieve a payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/payment_intents/${paymentIntentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to retrieve payment intent');
      }

      return await response.json();
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw error;
    }
  }

  /**
   * Retrieve a checkout session by ID
   */
  async getCheckoutSession(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/checkout/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to retrieve checkout session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error retrieving checkout session:', error);
      throw error;
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<any> {
    try {
      const params = new URLSearchParams({
        email,
        ...(name && { name }),
        ...this.formatMetadata(metadata || {}),
      });

      const response = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Customer creation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      // In a real implementation, you would use Stripe's webhook signature verification
      // This is a simplified version for demonstration
      const expectedSignature = this.config.webhookSecret;
      
      // Basic signature verification (in production, use proper HMAC verification)
      return signature.includes(expectedSignature);
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(eventType: string, data: any): Promise<void> {
    try {
      switch (eventType) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(data.object);
          break;
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(data.object);
          break;
        default:
          console.log(`Unhandled webhook event type: ${eventType}`);
      }
    } catch (error) {
      console.error(`Error processing webhook event ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: any): Promise<void> {
    console.log('Payment succeeded:', paymentIntent.id);
    
    // Extract project ID from metadata
    const projectId = paymentIntent.metadata?.project_id;
    if (projectId) {
      // Update project status to indicate payment completed
      // This would typically update the database
      console.log(`Payment completed for project ${projectId}`);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(paymentIntent: any): Promise<void> {
    console.log('Payment failed:', paymentIntent.id);
    
    const projectId = paymentIntent.metadata?.project_id;
    if (projectId) {
      console.log(`Payment failed for project ${projectId}`);
      // Handle payment failure (e.g., notify user, update project status)
    }
  }

  /**
   * Handle completed checkout session
   */
  private async handleCheckoutCompleted(session: any): Promise<void> {
    console.log('Checkout session completed:', session.id);
    
    const projectId = session.metadata?.project_id;
    if (projectId) {
      console.log(`Checkout completed for project ${projectId}`);
      // Update project status, send confirmation email, etc.
    }
  }

  /**
   * Handle successful invoice payment (for subscriptions)
   */
  private async handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
    console.log('Invoice payment succeeded:', invoice.id);
    // Handle subscription payment success
  }

  /**
   * Format metadata for Stripe API
   */
  private formatMetadata(metadata: Record<string, string>): Record<string, string> {
    const formatted: Record<string, string> = {};
    Object.entries(metadata).forEach(([key, value]) => {
      formatted[`metadata[${key}]`] = value;
    });
    return formatted;
  }

  /**
   * Get publishable key for frontend
   */
  getPublishableKey(): string {
    return this.config.publishableKey;
  }

  /**
   * Calculate validation service fee
   */
  static getValidationServiceFee(): number {
    return 10000; // $100.00 in cents
  }

  /**
   * Get validation service product details
   */
  static getValidationServiceDetails() {
    return {
      name: 'MVP Validation Service',
      description: 'Complete market validation service including landing page creation, ad campaign management, and detailed analytics report',
      price: 10000, // $100.00 in cents
      currency: 'usd',
    };
  }
}
