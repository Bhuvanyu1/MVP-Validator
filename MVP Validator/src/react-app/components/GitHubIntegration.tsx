import { useState, useEffect } from 'react';
import { Github, Plus, Unlink, AlertCircle, CheckCircle } from 'lucide-react';

interface GitHubIntegrationProps {
  projectId?: number;
  onRepoCreated?: (repoUrl: string) => void;
}

interface GitHubStatus {
  connected: boolean;
  username: string | null;
}

interface CreateRepoData {
  name: string;
  description: string;
  private: boolean;
}

export default function GitHubIntegration({ projectId, onRepoCreated }: GitHubIntegrationProps) {
  const [status, setStatus] = useState<GitHubStatus>({ connected: false, username: null });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [repoData, setRepoData] = useState<CreateRepoData>({
    name: '',
    description: '',
    private: false,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkGitHubStatus();
  }, []);

  const checkGitHubStatus = async () => {
    try {
      const response = await fetch('/api/github/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error checking GitHub status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGitHub = async () => {
    try {
      const response = await fetch('/api/github/auth');
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
      setMessage({ type: 'error', text: 'Failed to connect to GitHub' });
    }
  };

  const disconnectGitHub = async () => {
    try {
      const response = await fetch('/api/github/disconnect', { method: 'DELETE' });
      if (response.ok) {
        setStatus({ connected: false, username: null });
        setMessage({ type: 'success', text: 'GitHub account disconnected' });
      }
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      setMessage({ type: 'error', text: 'Failed to disconnect GitHub' });
    }
  };

  const createRepository = async () => {
    if (!repoData.name.trim()) {
      setMessage({ type: 'error', text: 'Repository name is required' });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/github-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repoData),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: 'Repository created successfully!' });
        setShowCreateForm(false);
        setRepoData({ name: '', description: '', private: false });
        if (onRepoCreated) {
          onRepoCreated(data.repoUrl);
        }
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to create repository' });
      }
    } catch (error) {
      console.error('Error creating repository:', error);
      setMessage({ type: 'error', text: 'Failed to create repository' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">GitHub Integration</h3>
              <p className="text-sm text-gray-600">
                {status.connected 
                  ? `Connected as @${status.username}` 
                  : 'Connect your GitHub account to create repositories'
                }
              </p>
            </div>
          </div>
          
          {status.connected ? (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600 font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-500">Not connected</span>
            </div>
          )}
        </div>

        {!status.connected ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Connect your GitHub account to automatically create repositories for your MVP projects.
            </p>
            <button
              onClick={connectGitHub}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center space-x-2"
            >
              <Github className="w-4 h-4" />
              <span>Connect GitHub</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {!showCreateForm ? (
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  Create a new repository for this project on GitHub.
                </p>
                <div className="flex items-center space-x-2">
                  {projectId && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Repo</span>
                    </button>
                  )}
                  <button
                    onClick={disconnectGitHub}
                    className="text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Disconnect GitHub"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-gray-900">Create New Repository</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repository Name *
                    </label>
                    <input
                      type="text"
                      value={repoData.name}
                      onChange={(e) => setRepoData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="my-mvp-project"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={repoData.description}
                      onChange={(e) => setRepoData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="A brief description of your MVP project"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="private"
                      checked={repoData.private}
                      onChange={(e) => setRepoData(prev => ({ ...prev, private: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="private" className="ml-2 text-sm text-gray-700">
                      Private repository
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={createRepository}
                    disabled={creating || !repoData.name.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {creating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>{creating ? 'Creating...' : 'Create Repository'}</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setRepoData({ name: '', description: '', private: false });
                      setMessage(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
