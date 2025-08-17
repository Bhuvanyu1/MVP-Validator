export interface LandingPageContent {
  heroTitle: string;
  heroSubtitle: string;
  valueProposition: string;
  features: string[];
  pricing: string;
  cta: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  benefits?: string[];
  socialProof?: string[];
  faqs?: Array<{ question: string; answer: string; }>;
}

export interface LandingPageTemplate {
  id: string;
  name: string;
  category: string;
}

export class LandingPageDeploymentService {
  constructor(private env: Env) {}

  /**
   * Generate HTML content for landing page based on template and content
   */
  generateHTML(template: LandingPageTemplate, content: LandingPageContent, trackingScript: string = ''): string {
    const { colors } = content;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.heroTitle}</title>
    <meta name="description" content="${content.heroSubtitle}">
    <meta property="og:title" content="${content.heroTitle}">
    <meta property="og:description" content="${content.heroSubtitle}">
    <meta property="og:type" content="website">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '${colors.primary}',
                        secondary: '${colors.secondary}',
                        accent: '${colors.accent}'
                    }
                }
            }
        }
    </script>
    
    <!-- Custom Styles -->
    <style>
        .gradient-bg {
            background: linear-gradient(135deg, ${colors.primary}10 0%, ${colors.accent}10 100%);
        }
        .hero-gradient {
            background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);
        }
        .feature-card:hover {
            transform: translateY(-4px);
            transition: transform 0.3s ease;
        }
        .cta-button {
            background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);
            transition: all 0.3s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
    </style>
    
    ${trackingScript}
</head>
<body class="bg-gray-50">
    ${this.generateTemplateHTML(template, content)}
    
    <!-- Contact Form Modal -->
    <div id="contactModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center">
        <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 class="text-2xl font-bold mb-4" style="color: ${colors.secondary}">Get Started Today!</h3>
            <form id="contactForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" name="name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" name="email" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                    <textarea name="message" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                </div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" class="flex-1 px-4 py-2 cta-button text-white rounded-lg font-semibold">
                        Send Message
                    </button>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        function openModal() {
            document.getElementById('contactModal').classList.remove('hidden');
        }
        
        function closeModal() {
            document.getElementById('contactModal').classList.add('hidden');
        }
        
        // Handle form submission
        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message')
            };
            
            // Send to backend
            fetch('/api/landing-page/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }).then(response => {
                if (response.ok) {
                    alert('Thank you! We\\'ll be in touch soon.');
                    closeModal();
                    e.target.reset();
                } else {
                    alert('Something went wrong. Please try again.');
                }
            }).catch(error => {
                console.error('Error:', error);
                alert('Something went wrong. Please try again.');
            });
        });
        
        // Close modal when clicking outside
        document.getElementById('contactModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    </script>
</body>
</html>`;
  }

  private generateTemplateHTML(template: LandingPageTemplate, content: LandingPageContent): string {
    switch (template.id) {
      case 'modern-saas':
        return this.generateModernSaaSTemplate(content);
      case 'service-pro':
        return this.generateServiceProTemplate(content);
      case 'product-showcase':
        return this.generateProductShowcaseTemplate(content);
      case 'course-academy':
        return this.generateCourseAcademyTemplate(content);
      case 'minimal-convert':
        return this.generateMinimalConverterTemplate(content);
      default:
        return this.generateModernSaaSTemplate(content);
    }
  }

  private generateModernSaaSTemplate(content: LandingPageContent): string {
    return `
    <!-- Hero Section -->
    <section class="hero-gradient text-white py-20">
        <div class="max-w-6xl mx-auto px-4 text-center">
            <h1 class="text-5xl md:text-6xl font-bold mb-6">${content.heroTitle}</h1>
            <p class="text-xl md:text-2xl mb-8 opacity-90">${content.heroSubtitle}</p>
            <button onclick="openModal()" class="cta-button text-white px-8 py-4 rounded-lg text-lg font-semibold">
                ${content.cta}
            </button>
        </div>
    </section>

    <!-- Value Proposition -->
    <section class="py-16 bg-white">
        <div class="max-w-4xl mx-auto px-4 text-center">
            <h2 class="text-3xl md:text-4xl font-bold mb-6" style="color: ${content.colors.secondary}">Why Choose Us?</h2>
            <p class="text-lg text-gray-600 leading-relaxed">${content.valueProposition}</p>
        </div>
    </section>

    <!-- Features -->
    <section class="py-16 gradient-bg">
        <div class="max-w-6xl mx-auto px-4">
            <h2 class="text-3xl md:text-4xl font-bold text-center mb-12" style="color: ${content.colors.secondary}">Key Features</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${content.features.map((feature, index) => `
                    <div class="feature-card bg-white p-6 rounded-lg shadow-lg">
                        <div class="w-12 h-12 rounded-lg mb-4 flex items-center justify-center text-white font-bold text-xl" style="background: ${content.colors.primary}">
                            ${index + 1}
                        </div>
                        <h3 class="text-xl font-semibold mb-3" style="color: ${content.colors.secondary}">${feature}</h3>
                        <p class="text-gray-600">Experience the power of ${feature.toLowerCase()} in your workflow.</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Benefits -->
    ${content.benefits ? `
    <section class="py-16 bg-white">
        <div class="max-w-4xl mx-auto px-4">
            <h2 class="text-3xl md:text-4xl font-bold text-center mb-12" style="color: ${content.colors.secondary}">Benefits You'll Love</h2>
            <div class="space-y-6">
                ${content.benefits.map(benefit => `
                    <div class="flex items-start space-x-4">
                        <div class="w-6 h-6 rounded-full flex-shrink-0 mt-1" style="background: ${content.colors.accent}"></div>
                        <p class="text-lg text-gray-700">${benefit}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
    ` : ''}

    <!-- Pricing -->
    <section class="py-16 gradient-bg">
        <div class="max-w-4xl mx-auto px-4 text-center">
            <h2 class="text-3xl md:text-4xl font-bold mb-6" style="color: ${content.colors.secondary}">Simple Pricing</h2>
            <div class="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto">
                <div class="text-4xl font-bold mb-2" style="color: ${content.colors.primary}">${content.pricing}</div>
                <p class="text-gray-600 mb-6">Everything you need to get started</p>
                <button onclick="openModal()" class="cta-button text-white px-8 py-3 rounded-lg font-semibold w-full">
                    ${content.cta}
                </button>
            </div>
        </div>
    </section>

    <!-- FAQ -->
    ${content.faqs ? `
    <section class="py-16 bg-white">
        <div class="max-w-4xl mx-auto px-4">
            <h2 class="text-3xl md:text-4xl font-bold text-center mb-12" style="color: ${content.colors.secondary}">Frequently Asked Questions</h2>
            <div class="space-y-6">
                ${content.faqs.map(faq => `
                    <div class="border border-gray-200 rounded-lg p-6">
                        <h3 class="text-lg font-semibold mb-3" style="color: ${content.colors.secondary}">${faq.question}</h3>
                        <p class="text-gray-600">${faq.answer}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
    ` : ''}

    <!-- Final CTA -->
    <section class="py-16 hero-gradient text-white text-center">
        <div class="max-w-4xl mx-auto px-4">
            <h2 class="text-3xl md:text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p class="text-xl mb-8 opacity-90">Join thousands of satisfied customers today</p>
            <button onclick="openModal()" class="bg-white px-8 py-4 rounded-lg text-lg font-semibold" style="color: ${content.colors.primary}">
                ${content.cta}
            </button>
        </div>
    </section>`;
  }

  private generateServiceProTemplate(content: LandingPageContent): string {
    return `
    <!-- Professional Service Template -->
    <section class="bg-gray-900 text-white py-20">
        <div class="max-w-6xl mx-auto px-4 text-center">
            <h1 class="text-4xl md:text-5xl font-bold mb-6">${content.heroTitle}</h1>
            <p class="text-xl mb-8 opacity-90">${content.heroSubtitle}</p>
            <button onclick="openModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold">
                ${content.cta}
            </button>
        </div>
    </section>

    <!-- Trust Indicators -->
    <section class="py-16 bg-white">
        <div class="max-w-6xl mx-auto px-4">
            <div class="grid md:grid-cols-3 gap-8 text-center">
                <div>
                    <div class="text-4xl font-bold text-blue-600 mb-2">10+</div>
                    <p class="text-gray-600">Years Experience</p>
                </div>
                <div>
                    <div class="text-4xl font-bold text-blue-600 mb-2">500+</div>
                    <p class="text-gray-600">Happy Clients</p>
                </div>
                <div>
                    <div class="text-4xl font-bold text-blue-600 mb-2">99%</div>
                    <p class="text-gray-600">Satisfaction Rate</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Services -->
    <section class="py-16 bg-gray-50">
        <div class="max-w-6xl mx-auto px-4">
            <h2 class="text-3xl font-bold text-center mb-12">Our Services</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${content.features.map(feature => `
                    <div class="bg-white p-6 rounded-lg shadow-lg">
                        <h3 class="text-xl font-semibold mb-3">${feature}</h3>
                        <p class="text-gray-600">Professional ${feature.toLowerCase()} services tailored to your needs.</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- CTA -->
    <section class="py-16 bg-blue-600 text-white text-center">
        <div class="max-w-4xl mx-auto px-4">
            <h2 class="text-3xl font-bold mb-6">Ready to Work Together?</h2>
            <p class="text-xl mb-8">Let's discuss your project and how we can help</p>
            <button onclick="openModal()" class="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold">
                ${content.cta}
            </button>
        </div>
    </section>`;
  }

  private generateProductShowcaseTemplate(content: LandingPageContent): string {
    return `
    <!-- Product Showcase Template -->
    <section class="bg-gradient-to-r from-orange-500 to-red-500 text-white py-20">
        <div class="max-w-6xl mx-auto px-4">
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h1 class="text-4xl md:text-5xl font-bold mb-6">${content.heroTitle}</h1>
                    <p class="text-xl mb-8 opacity-90">${content.heroSubtitle}</p>
                    <button onclick="openModal()" class="bg-white text-orange-600 px-8 py-4 rounded-lg text-lg font-semibold">
                        ${content.cta}
                    </button>
                </div>
                <div class="bg-white/20 rounded-lg p-8 backdrop-blur-sm">
                    <div class="text-center">
                        <div class="w-32 h-32 bg-white/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span class="text-4xl">📦</span>
                        </div>
                        <p class="text-lg">Product Preview</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Grid -->
    <section class="py-16 bg-white">
        <div class="max-w-6xl mx-auto px-4">
            <h2 class="text-3xl font-bold text-center mb-12">Product Features</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${content.features.map((feature, index) => `
                    <div class="text-center p-6">
                        <div class="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span class="text-2xl text-orange-600">${index + 1}</span>
                        </div>
                        <h3 class="text-xl font-semibold mb-3">${feature}</h3>
                        <p class="text-gray-600">Discover the amazing ${feature.toLowerCase()} capabilities.</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Pricing -->
    <section class="py-16 bg-gray-50">
        <div class="max-w-4xl mx-auto px-4 text-center">
            <h2 class="text-3xl font-bold mb-12">Get Yours Today</h2>
            <div class="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto">
                <div class="text-4xl font-bold text-orange-600 mb-4">${content.pricing}</div>
                <button onclick="openModal()" class="bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold w-full">
                    ${content.cta}
                </button>
            </div>
        </div>
    </section>`;
  }

  private generateCourseAcademyTemplate(content: LandingPageContent): string {
    return `
    <!-- Course Academy Template -->
    <section class="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-20">
        <div class="max-w-6xl mx-auto px-4 text-center">
            <h1 class="text-4xl md:text-5xl font-bold mb-6">${content.heroTitle}</h1>
            <p class="text-xl mb-8 opacity-90">${content.heroSubtitle}</p>
            <button onclick="openModal()" class="bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold">
                ${content.cta}
            </button>
        </div>
    </section>

    <!-- Course Modules -->
    <section class="py-16 bg-white">
        <div class="max-w-6xl mx-auto px-4">
            <h2 class="text-3xl font-bold text-center mb-12">What You'll Learn</h2>
            <div class="space-y-6">
                ${content.features.map((feature, index) => `
                    <div class="flex items-center space-x-4 p-6 bg-green-50 rounded-lg">
                        <div class="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                            ${index + 1}
                        </div>
                        <div>
                            <h3 class="text-xl font-semibold">${feature}</h3>
                            <p class="text-gray-600">Master ${feature.toLowerCase()} with our comprehensive curriculum.</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Enrollment -->
    <section class="py-16 bg-green-600 text-white text-center">
        <div class="max-w-4xl mx-auto px-4">
            <h2 class="text-3xl font-bold mb-6">Start Learning Today</h2>
            <p class="text-xl mb-8">Join thousands of students already enrolled</p>
            <div class="text-3xl font-bold mb-4">${content.pricing}</div>
            <button onclick="openModal()" class="bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold">
                ${content.cta}
            </button>
        </div>
    </section>`;
  }

  private generateMinimalConverterTemplate(content: LandingPageContent): string {
    return `
    <!-- Minimal Converter Template -->
    <section class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
        <div class="max-w-2xl mx-auto px-4 text-center">
            <h1 class="text-5xl md:text-6xl font-bold mb-6 text-gray-900">${content.heroTitle}</h1>
            <p class="text-xl mb-8 text-gray-600">${content.heroSubtitle}</p>
            <p class="text-lg mb-8 text-gray-700">${content.valueProposition}</p>
            <button onclick="openModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-12 py-4 rounded-lg text-xl font-semibold mb-8">
                ${content.cta}
            </button>
            <div class="text-2xl font-bold text-purple-600">${content.pricing}</div>
        </div>
    </section>`;
  }

  /**
   * Deploy landing page to Cloudflare Pages
   */
  async deployToPages(projectId: string, html: string): Promise<{ url: string; success: boolean; }> {
    try {
      // Generate unique subdomain
      const subdomain = `mvp-${projectId}-${Date.now().toString(36)}`;
      const url = `https://${subdomain}.pages.dev`;

      // In a real implementation, you would:
      // 1. Create a new Pages project via Cloudflare API
      // 2. Upload the HTML file
      // 3. Deploy the site
      // 4. Return the live URL

      // For now, we'll simulate the deployment
      console.log(`Deploying landing page for project ${projectId} to ${url}`);
      
      return {
        url,
        success: true
      };
    } catch (error) {
      console.error('Deployment error:', error);
      return {
        url: '',
        success: false
      };
    }
  }
}
