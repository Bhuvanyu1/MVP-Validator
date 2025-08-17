export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailNotificationData {
  projectId: string;
  projectTitle: string;
  userEmail: string;
  userName?: string;
  eventType: 'prototype_generated' | 'campaign_launched' | 'payment_completed' | 'report_ready' | 'validation_complete';
  eventData?: any;
}

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

export class EmailNotificationService {
  private config: ResendConfig;

  constructor(config: ResendConfig) {
    this.config = config;
  }

  /**
   * Send email notification based on event type
   */
  async sendNotification(data: EmailNotificationData): Promise<boolean> {
    try {
      const template = this.getEmailTemplate(data);
      
      const emailData = {
        from: `${this.config.fromName || 'MVP Validator'} <${this.config.fromEmail}>`,
        to: [data.userEmail],
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to send email:', error);
        return false;
      }

      const result = await response.json();
      console.log('Email sent successfully:', result.id);
      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }

  /**
   * Send bulk email notifications
   */
  async sendBulkNotifications(notifications: EmailNotificationData[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      const sent = await this.sendNotification(notification);
      if (sent) {
        success++;
      } else {
        failed++;
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { success, failed };
  }

  /**
   * Send custom email with template
   */
  async sendCustomEmail(
    recipients: EmailRecipient[],
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<boolean> {
    try {
      const emailData = {
        from: `${this.config.fromName || 'MVP Validator'} <${this.config.fromEmail}>`,
        to: recipients.map(r => r.email),
        subject,
        html: htmlContent,
        text: textContent,
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending custom email:', error);
      return false;
    }
  }

  /**
   * Get email template based on event type
   */
  private getEmailTemplate(data: EmailNotificationData): EmailTemplate {
    const { eventType, projectTitle, userName, eventData } = data;
    const userDisplayName = userName || 'there';

    switch (eventType) {
      case 'prototype_generated':
        return {
          subject: `🚀 Your MVP prototype is ready - ${projectTitle}`,
          html: this.generatePrototypeReadyHTML(userDisplayName, projectTitle, data.projectId),
          text: `Hi ${userDisplayName}!\n\nGreat news! Your MVP prototype for "${projectTitle}" has been generated and is ready for review.\n\nYou can view and customize your prototype by visiting your project dashboard.\n\nNext steps:\n- Review the generated marketing copy and features\n- Create a landing page to test market demand\n- Launch validation campaigns\n\nBest regards,\nThe MVP Validator Team`
        };

      case 'campaign_launched':
        return {
          subject: `📈 Your validation campaign is now live - ${projectTitle}`,
          html: this.generateCampaignLaunchedHTML(userDisplayName, projectTitle, data.projectId, eventData),
          text: `Hi ${userDisplayName}!\n\nYour validation campaign for "${projectTitle}" is now live and collecting data.\n\nCampaign Details:\n- Budget: $${eventData?.budget || 'N/A'}\n- Platform: ${eventData?.platform || 'Multiple'}\n- Duration: ${eventData?.duration || '7 days'}\n\nWe'll monitor the performance and send you updates as data comes in.\n\nBest regards,\nThe MVP Validator Team`
        };

      case 'payment_completed':
        return {
          subject: `✅ Payment confirmed - Full validation activated for ${projectTitle}`,
          html: this.generatePaymentCompletedHTML(userDisplayName, projectTitle, data.projectId, eventData),
          text: `Hi ${userDisplayName}!\n\nThank you for your payment! Full validation features are now activated for "${projectTitle}".\n\nWhat's included:\n- Landing page creation and deployment\n- Multi-platform advertising campaigns\n- Advanced analytics and reporting\n- Comprehensive market validation insights\n\nYou can access all features from your project dashboard.\n\nBest regards,\nThe MVP Validator Team`
        };

      case 'report_ready':
        return {
          subject: `📊 Your validation report is ready - ${projectTitle}`,
          html: this.generateReportReadyHTML(userDisplayName, projectTitle, data.projectId, eventData),
          text: `Hi ${userDisplayName}!\n\nYour comprehensive validation report for "${projectTitle}" is now ready for download.\n\nThe report includes:\n- Executive summary with validation score\n- Detailed performance metrics\n- Market insights and recommendations\n- Next steps for your business\n\nDownload your report from the project dashboard.\n\nBest regards,\nThe MVP Validator Team`
        };

      case 'validation_complete':
        return {
          subject: `🎉 Validation complete! Here are your results - ${projectTitle}`,
          html: this.generateValidationCompleteHTML(userDisplayName, projectTitle, data.projectId, eventData),
          text: `Hi ${userDisplayName}!\n\nCongratulations! The market validation for "${projectTitle}" is now complete.\n\nValidation Score: ${eventData?.validationScore || 'N/A'}/10\nMarket Viability: ${eventData?.marketViability || 'N/A'}\n\nKey Results:\n- Total Traffic: ${eventData?.totalTraffic || 'N/A'} visitors\n- Conversion Rate: ${eventData?.conversionRate || 'N/A'}%\n- Market Interest: ${eventData?.marketInterest || 'N/A'}\n\nView your complete results and detailed recommendations in the project dashboard.\n\nBest regards,\nThe MVP Validator Team`
        };

      default:
        return {
          subject: `Update for your project - ${projectTitle}`,
          html: this.generateGenericHTML(userDisplayName, projectTitle, data.projectId),
          text: `Hi ${userDisplayName}!\n\nThere's an update for your project "${projectTitle}". Please check your dashboard for more details.\n\nBest regards,\nThe MVP Validator Team`
        };
    }
  }

  /**
   * Generate HTML templates for different notification types
   */
  private generatePrototypeReadyHTML(userName: string, projectTitle: string, projectId: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your MVP Prototype is Ready</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Your Prototype is Ready!</h1>
            <p>AI-powered marketing content generated for your MVP</p>
        </div>
        
        <div class="content">
            <h2>Hi ${userName}!</h2>
            
            <p>Great news! Your MVP prototype for <strong>"${projectTitle}"</strong> has been generated and is ready for review.</p>
            
            <p><strong>What's included:</strong></p>
            <ul>
                <li>Compelling hero copy and value propositions</li>
                <li>Key features and benefits breakdown</li>
                <li>Pricing structure recommendations</li>
                <li>Target audience insights</li>
            </ul>
            
            <a href="https://mvp-validator.com/projects/${projectId}" class="button">View Your Prototype</a>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
                <li>Review and customize the generated content</li>
                <li>Create a landing page to test market demand</li>
                <li>Launch validation campaigns to gather data</li>
            </ol>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 MVP Validator. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateCampaignLaunchedHTML(userName: string, projectTitle: string, projectId: string, eventData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your Campaign is Live</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📈 Campaign is Live!</h1>
            <p>Your validation campaign is now collecting data</p>
        </div>
        
        <div class="content">
            <h2>Hi ${userName}!</h2>
            
            <p>Your validation campaign for <strong>"${projectTitle}"</strong> is now live!</p>
            
            <p><strong>Campaign Details:</strong></p>
            <ul>
                <li>Budget: $${eventData?.budget || '70'}</li>
                <li>Platform: ${eventData?.platform || 'Multi-platform'}</li>
                <li>Duration: ${eventData?.duration || '7'} days</li>
            </ul>
            
            <a href="https://mvp-validator.com/projects/${projectId}" class="button">View Campaign Analytics</a>
            
            <p>We're monitoring performance and will send updates as data comes in.</p>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 MVP Validator. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generatePaymentCompletedHTML(userName: string, projectTitle: string, projectId: string, eventData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Confirmed</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Payment Confirmed!</h1>
            <p>Full validation features are now activated</p>
        </div>
        
        <div class="content">
            <h2>Hi ${userName}!</h2>
            
            <p>Thank you for your payment! Full validation features are now activated for <strong>"${projectTitle}"</strong>.</p>
            
            <p><strong>You now have access to:</strong></p>
            <ul>
                <li>Professional landing page creation and deployment</li>
                <li>Multi-platform advertising campaigns</li>
                <li>Advanced analytics and real-time reporting</li>
                <li>Comprehensive market validation insights</li>
                <li>Professional validation reports (PDF export)</li>
            </ul>
            
            <p>Investment: <strong>$${eventData?.amount || '100'}</strong></p>
            
            <a href="https://mvp-validator.com/projects/${projectId}" class="button">Access Full Features</a>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 MVP Validator. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateReportReadyHTML(userName: string, projectTitle: string, projectId: string, eventData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your Validation Report is Ready</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Report Ready!</h1>
            <p>Your comprehensive validation report is available</p>
        </div>
        
        <div class="content">
            <h2>Hi ${userName}!</h2>
            
            <p>Your validation report for <strong>"${projectTitle}"</strong> is ready!</p>
            
            <p><strong>Report includes:</strong></p>
            <ul>
                <li>Executive summary with validation score</li>
                <li>Detailed performance metrics</li>
                <li>Market analysis and audience insights</li>
                <li>Strategic recommendations</li>
            </ul>
            
            <a href="https://mvp-validator.com/projects/${projectId}/reports" class="button">Download Your Report</a>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 MVP Validator. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateValidationCompleteHTML(userName: string, projectTitle: string, projectId: string, eventData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Validation Complete</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Validation Complete!</h1>
            <p>Your market validation results are in</p>
        </div>
        
        <div class="content">
            <h2>Congratulations ${userName}!</h2>
            
            <p>Market validation for <strong>"${projectTitle}"</strong> is complete!</p>
            
            <p><strong>Results Summary:</strong></p>
            <ul>
                <li>Validation Score: ${eventData?.validationScore || 'N/A'}/10</li>
                <li>Market Viability: ${eventData?.marketViability || 'Medium'}</li>
                <li>Total Traffic: ${eventData?.totalTraffic || 'N/A'} visitors</li>
                <li>Conversion Rate: ${eventData?.conversionRate || 'N/A'}%</li>
            </ul>
            
            <a href="https://mvp-validator.com/projects/${projectId}" class="button">View Complete Results</a>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 MVP Validator. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateGenericHTML(userName: string, projectTitle: string, projectId: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Project Update</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #3b82f6; color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Project Update</h1>
        </div>
        
        <div class="content">
            <h2>Hi ${userName}!</h2>
            
            <p>There's an update for your project <strong>"${projectTitle}"</strong>.</p>
            
            <a href="https://mvp-validator.com/projects/${projectId}" class="button">View Project</a>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 MVP Validator. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }
}
