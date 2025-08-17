import { useState, useEffect } from 'react';
import { Eye, Code, Save, Globe, Palette, Type, Image, Layout } from 'lucide-react';

interface LandingPageBuilderProps {
  projectId: string;
  prototype: any;
  onSave: (landingPageData: any) => void;
}

interface LandingPageTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: 'saas' | 'service' | 'product' | 'course';
}

const templates: LandingPageTemplate[] = [
  {
    id: 'modern-saas',
    name: 'Modern SaaS',
    description: 'Clean, conversion-focused design for SaaS products',
    preview: 'bg-gradient-to-br from-blue-50 to-indigo-100',
    category: 'saas'
  },
  {
    id: 'service-pro',
    name: 'Professional Service',
    description: 'Trust-building layout for service businesses',
    preview: 'bg-gradient-to-br from-gray-50 to-slate-100',
    category: 'service'
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    description: 'Visual-first design for physical/digital products',
    preview: 'bg-gradient-to-br from-orange-50 to-red-100',
    category: 'product'
  },
  {
    id: 'course-academy',
    name: 'Course Academy',
    description: 'Educational layout for courses and content',
    preview: 'bg-gradient-to-br from-green-50 to-emerald-100',
    category: 'course'
  },
  {
    id: 'minimal-convert',
    name: 'Minimal Converter',
    description: 'Distraction-free design for maximum conversions',
    preview: 'bg-gradient-to-br from-purple-50 to-pink-100',
    category: 'saas'
  }
];

export default function LandingPageBuilder({ projectId, prototype, onSave }: LandingPageBuilderProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('modern-saas');
  const [content, setContent] = useState({
    heroTitle: prototype?.heroCopy || '',
    heroSubtitle: '',
    valueProposition: '',
    features: [],
    pricing: prototype?.pricingStructure || '',
    cta: 'Get Started',
    colors: {
      primary: '#3B82F6',
      secondary: '#1F2937',
      accent: '#10B981'
    }
  });
  const [activeTab, setActiveTab] = useState<'template' | 'content' | 'design' | 'preview'>('template');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    if (prototype?.featuresJson) {
      try {
        const features = JSON.parse(prototype.featuresJson);
        setContent(prev => ({ ...prev, features }));
      } catch (error) {
        console.error('Error parsing features:', error);
      }
    }
  }, [prototype]);

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/generate-landing-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate })
      });

      if (response.ok) {
        const generatedContent = await response.json();
        setContent(prev => ({ ...prev, ...generatedContent }));
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    const landingPageData = {
      templateId: selectedTemplate,
      content,
      projectId
    };

    try {
      const response = await fetch(`/api/projects/${projectId}/landing-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(landingPageData)
      });

      if (response.ok) {
        const result = await response.json();
        onSave(result);
      }
    } catch (error) {
      console.error('Error saving landing page:', error);
    }
  };

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Choose a Template</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                selectedTemplate === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className={`h-24 rounded mb-3 ${template.preview}`}></div>
              <h4 className="font-medium">{template.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={handleGenerateContent}
          disabled={isGenerating}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Type className="w-4 h-4" />
          {isGenerating ? 'Generating...' : 'Generate Content'}
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Next: Content
        </button>
      </div>
    </div>
  );

  const renderContentEditor = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Edit Content</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Hero Title</label>
            <input
              type="text"
              value={content.heroTitle}
              onChange={(e) => setContent(prev => ({ ...prev, heroTitle: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Your compelling headline..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Hero Subtitle</label>
            <textarea
              value={content.heroSubtitle}
              onChange={(e) => setContent(prev => ({ ...prev, heroSubtitle: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Supporting text that explains your value proposition..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Value Proposition</label>
            <textarea
              value={content.valueProposition}
              onChange={(e) => setContent(prev => ({ ...prev, valueProposition: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="What makes your solution unique and valuable..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Call to Action Text</label>
            <input
              type="text"
              value={content.cta}
              onChange={(e) => setContent(prev => ({ ...prev, cta: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Get Started"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setActiveTab('template')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back: Template
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Next: Design
        </button>
      </div>
    </div>
  );

  const renderDesignEditor = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Customize Design</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Primary Color</label>
            <input
              type="color"
              value={content.colors.primary}
              onChange={(e) => setContent(prev => ({
                ...prev,
                colors: { ...prev.colors, primary: e.target.value }
              }))}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Secondary Color</label>
            <input
              type="color"
              value={content.colors.secondary}
              onChange={(e) => setContent(prev => ({
                ...prev,
                colors: { ...prev.colors, secondary: e.target.value }
              }))}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Accent Color</label>
            <input
              type="color"
              value={content.colors.accent}
              onChange={(e) => setContent(prev => ({
                ...prev,
                colors: { ...prev.colors, accent: e.target.value }
              }))}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setActiveTab('content')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back: Content
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Next: Preview
        </button>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Preview & Deploy</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode('desktop')}
            className={`px-3 py-1 rounded ${previewMode === 'desktop' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Desktop
          </button>
          <button
            onClick={() => setPreviewMode('tablet')}
            className={`px-3 py-1 rounded ${previewMode === 'tablet' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Tablet
          </button>
          <button
            onClick={() => setPreviewMode('mobile')}
            className={`px-3 py-1 rounded ${previewMode === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Mobile
          </button>
        </div>
      </div>

      <div className={`border rounded-lg overflow-hidden ${
        previewMode === 'desktop' ? 'w-full' :
        previewMode === 'tablet' ? 'w-3/4 mx-auto' : 'w-1/3 mx-auto'
      }`}>
        <div className="bg-white p-8 text-center" style={{ backgroundColor: content.colors.primary + '10' }}>
          <h1 className="text-4xl font-bold mb-4" style={{ color: content.colors.secondary }}>
            {content.heroTitle || 'Your Hero Title'}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {content.heroSubtitle || 'Your compelling subtitle goes here'}
          </p>
          <button
            className="px-8 py-3 rounded-lg text-white font-semibold"
            style={{ backgroundColor: content.colors.primary }}
          >
            {content.cta}
          </button>
        </div>
        
        <div className="p-8">
          <h2 className="text-2xl font-bold mb-4" style={{ color: content.colors.secondary }}>
            Why Choose Us?
          </h2>
          <p className="text-gray-600">
            {content.valueProposition || 'Your value proposition will appear here'}
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setActiveTab('design')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back: Design
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Globe className="w-4 h-4" />
          Save & Deploy
        </button>
      </div>
    </div>
  );

  const tabs = [
    { id: 'template', label: 'Template', icon: Layout },
    { id: 'content', label: 'Content', icon: Type },
    { id: 'design', label: 'Design', icon: Palette },
    { id: 'preview', label: 'Preview', icon: Eye },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Landing Page Builder</h2>
        <p className="text-gray-600">Create a conversion-optimized landing page for your idea</p>
      </div>

      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'template' && renderTemplateSelection()}
        {activeTab === 'content' && renderContentEditor()}
        {activeTab === 'design' && renderDesignEditor()}
        {activeTab === 'preview' && renderPreview()}
      </div>
    </div>
  );
}
