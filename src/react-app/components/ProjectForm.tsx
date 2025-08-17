import { useState } from 'react';
import { X, Lightbulb, TrendingUp, DollarSign, Users } from 'lucide-react';
import { NewProject, BusinessModel } from '@/shared/types';

interface ProjectFormProps {
  onClose: () => void;
  onProjectCreated: (project: any) => void;
}

export default function ProjectForm({ onClose, onProjectCreated }: ProjectFormProps) {
  const [formData, setFormData] = useState<NewProject>({
    ideaDescription: '',
    targetAudience: '',
    pricePoint: 0,
    businessModel: 'saas' as BusinessModel,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const businessModels = [
    { value: 'saas', label: 'SaaS', description: 'Software as a Service' },
    { value: 'service', label: 'Service', description: 'Professional services' },
    { value: 'product', label: 'Product', description: 'Physical or digital product' },
    { value: 'course', label: 'Course', description: 'Educational content' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.ideaDescription || formData.ideaDescription.length < 10) {
      newErrors.ideaDescription = 'Please provide at least 10 characters describing your idea';
    }
    if (formData.ideaDescription && formData.ideaDescription.length > 500) {
      newErrors.ideaDescription = 'Description must be less than 500 characters';
    }

    if (!formData.targetAudience || formData.targetAudience.length < 5) {
      newErrors.targetAudience = 'Please provide at least 5 characters describing your target audience';
    }
    if (formData.targetAudience && formData.targetAudience.length > 200) {
      newErrors.targetAudience = 'Target audience must be less than 200 characters';
    }

    if (formData.pricePoint < 0) {
      newErrors.pricePoint = 'Price point must be a positive number';
    }
    if (formData.pricePoint > 10000) {
      newErrors.pricePoint = 'Price point must be less than $10,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newProject = await response.json();
        onProjectCreated(newProject);
        onClose();
      } else {
        const errorData = await response.json();
        setErrors({ general: errorData.error || 'Failed to create project' });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof NewProject, value: string | number | BusinessModel) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">New MVP Validation</h2>
              <p className="text-sm text-gray-600">Submit your idea for AI-powered validation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Business Idea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lightbulb className="w-4 h-4 inline mr-1" />
              Business Idea *
            </label>
            <textarea
              value={formData.ideaDescription}
              onChange={(e) => handleInputChange('ideaDescription', e.target.value)}
              placeholder="Describe your business idea in detail. What problem does it solve? How does it work? What makes it unique?"
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.ideaDescription ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.ideaDescription && (
                <p className="text-red-600 text-xs">{errors.ideaDescription}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {formData.ideaDescription.length}/500 characters
              </p>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Target Audience *
            </label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={(e) => handleInputChange('targetAudience', e.target.value)}
              placeholder="e.g., Small business owners, Software developers, Marketing agencies"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.targetAudience ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              maxLength={200}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.targetAudience && (
                <p className="text-red-600 text-xs">{errors.targetAudience}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {formData.targetAudience.length}/200 characters
              </p>
            </div>
          </div>

          {/* Business Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Business Model *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {businessModels.map((model) => (
                <label
                  key={model.value}
                  className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all ${
                    formData.businessModel === model.value
                      ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="businessModel"
                    value={model.value}
                    checked={formData.businessModel === model.value}
                    onChange={(e) => handleInputChange('businessModel', e.target.value as BusinessModel)}
                    className="sr-only"
                  />
                  <div className="flex flex-col">
                    <span className={`block text-sm font-medium ${
                      formData.businessModel === model.value ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {model.label}
                    </span>
                    <span className={`block text-xs ${
                      formData.businessModel === model.value ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {model.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Price Point */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Expected Price Point *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                value={formData.pricePoint || ''}
                onChange={(e) => handleInputChange('pricePoint', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                max="10000"
                step="0.01"
                className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.pricePoint ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.pricePoint && (
              <p className="text-red-600 text-xs mt-1">{errors.pricePoint}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              This helps us tailor the validation approach and target audience
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  <span>Start Validation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
