import { useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  PlayCircle, 
  FileText,
  Calendar,
  DollarSign,
  Users,
  Github,
  ExternalLink
} from 'lucide-react';
import { Project } from '@/shared/types';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (loading) return;
    setLoading(true);
    navigate(`/projects/${project.id}`);
  };

  const statusConfig = {
    draft: {
      icon: Clock,
      label: 'Draft',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      description: 'Ready to generate prototype'
    },
    prototype_generated: {
      icon: FileText,
      label: 'Prototype Ready',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'AI prototype generated'
    },
    landing_page_created: {
      icon: PlayCircle,
      label: 'Landing Page Live',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Landing page deployed'
    },
    campaign_launched: {
      icon: TrendingUp,
      label: 'Campaign Running',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Market validation in progress'
    },
    completed: {
      icon: CheckCircle,
      label: 'Completed',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Validation complete'
    }
  };

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = status.icon;

  const businessModelLabels = {
    saas: 'SaaS',
    service: 'Service',
    product: 'Product',
    course: 'Course'
  };

  const businessModelLabel = businessModelLabels[project.businessModel as keyof typeof businessModelLabels] || project.businessModel;

  return (
    <div 
      onClick={handleClick}
      className={`bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer hover:bg-white/90 hover:border-gray-300 ${loading ? 'opacity-75' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${status.bgColor}`}>
            <StatusIcon className={`w-5 h-5 ${status.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-1">{status.label}</h3>
            <p className="text-sm text-gray-600">{status.description}</p>
          </div>
        </div>
        
        {project.github_repo_url && (
          <a
            href={project.github_repo_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            title="View on GitHub"
          >
            <Github className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
          </a>
        )}
      </div>

      {/* Project Description */}
      <div className="mb-4">
        <p className="text-gray-700 line-clamp-3 leading-relaxed">
          {project.ideaDescription}
        </p>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 truncate" title={project.targetAudience || 'Not specified'}>
            {project.targetAudience || 'Target audience TBD'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            ${project.pricePoint ? project.pricePoint.toLocaleString() : 'TBD'}
          </span>
        </div>
      </div>

      {/* Business Model & Date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
            {businessModelLabel}
          </span>
        </div>
        
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Progress</span>
          <span>{Math.round((Object.keys(statusConfig).indexOf(project.status) + 1) / Object.keys(statusConfig).length * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-1.5 rounded-full transition-all duration-300"
            style={{ 
              width: `${(Object.keys(statusConfig).indexOf(project.status) + 1) / Object.keys(statusConfig).length * 100}%` 
            }}
          />
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/50 rounded-xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
