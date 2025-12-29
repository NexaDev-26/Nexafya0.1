import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Eye, Loader2, Clock, User, Calendar, AlertCircle } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { Article } from '../types';
import { db } from '../services/db';
import { useDarkMode } from '../contexts/DarkModeContext';

interface ArticleVerificationProps {
  onClose?: () => void;
}

export const ArticleVerification: React.FC<ArticleVerificationProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected'>('pending');

  useEffect(() => {
    loadArticles();
  }, [activeTab]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        // Load articles pending verification assigned to this doctor
        const pending = await db.getArticlesPendingVerification(user?.id);
        setArticles(pending);
      } else {
        // Load all articles with the selected status
        const allArticles = await db.getArticles();
        setArticles(allArticles.filter(a => a.status === activeTab));
      }
    } catch (error) {
      console.error('Failed to load articles:', error);
      notify('Failed to load articles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedArticle) return;

    try {
      await db.verifyArticle(
        selectedArticle.id,
        user?.id || '',
        user?.name || '',
        verificationNotes
      );
      notify('Article verified successfully', 'success');
      setSelectedArticle(null);
      setVerificationNotes('');
      loadArticles();
    } catch (error) {
      notify('Failed to verify article', 'error');
    }
  };

  const handleReject = async () => {
    if (!selectedArticle || !rejectionReason.trim()) {
      notify('Please provide a rejection reason', 'error');
      return;
    }

    try {
      await db.rejectArticle(
        selectedArticle.id,
        user?.id || '',
        rejectionReason
      );
      notify('Article rejected', 'info');
      setSelectedArticle(null);
      setRejectionReason('');
      loadArticles();
    } catch (error) {
      notify('Failed to reject article', 'error');
    }
  };

  const handlePublish = async (articleId: string) => {
    try {
      await db.publishArticle(articleId);
      notify('Article published successfully', 'success');
      loadArticles();
    } catch (error) {
      notify('Failed to publish article', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending_verification: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      published: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-600'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      draft: FileText,
      pending_verification: Clock,
      verified: CheckCircle,
      published: CheckCircle,
      rejected: XCircle,
      archived: FileText
    };
    return icons[status as keyof typeof icons] || FileText;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Article Verification</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review and verify articles submitted by doctors
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'pending'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Clock className="inline mr-2" size={18} />
          Pending ({articles.filter(a => a.status === 'pending_verification').length})
        </button>
        <button
          onClick={() => setActiveTab('verified')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'verified'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <CheckCircle className="inline mr-2" size={18} />
          Verified
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'rejected'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <XCircle className="inline mr-2" size={18} />
          Rejected
        </button>
      </div>

      {/* Articles List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {articles.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500 dark:text-gray-400">No articles to review</p>
          </div>
        ) : (
          articles.map((article) => {
            const StatusIcon = getStatusIcon(article.status);
            return (
              <div
                key={article.id}
                className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        {article.authorName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {article.date}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusColor(article.status)}`}>
                    <StatusIcon className="inline mr-1" size={14} />
                    {article.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Excerpt */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {article.excerpt}
                </p>

                {/* Category & Premium */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-lg font-medium">
                    {article.category}
                  </span>
                  {article.isPremium && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded-lg font-medium">
                      Premium ({article.currency} {article.price})
                    </span>
                  )}
                </div>

                {/* Verification Info */}
                {article.verifiedBy && (
                  <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Verified by {article.verifiedByName} on {article.verifiedAt && new Date(article.verifiedAt).toLocaleDateString()}
                    </p>
                    {article.verificationNotes && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Notes:</strong> {article.verificationNotes}
                      </p>
                    )}
                    {article.rejectionReason && (
                      <p className="text-sm text-red-700 dark:text-red-400">
                        <AlertCircle className="inline mr-1" size={14} />
                        <strong>Reason:</strong> {article.rejectionReason}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedArticle(article)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    Review
                  </button>
                  {article.status === 'verified' && user?.role === 'ADMIN' && (
                    <button
                      onClick={() => handlePublish(article.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium"
                    >
                      Publish
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Article Review Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedArticle.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    {selectedArticle.authorName} ({selectedArticle.authorRole})
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {selectedArticle.date}
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusColor(selectedArticle.status)}`}>
                    {selectedArticle.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedArticle(null);
                  setVerificationNotes('');
                  setRejectionReason('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Cover Image */}
            {selectedArticle.image && (
              <img
                src={selectedArticle.image}
                alt={selectedArticle.title}
                className="w-full h-64 object-cover rounded-xl mb-6"
              />
            )}

            {/* Content */}
            <div className="prose dark:prose-invert max-w-none mb-6">
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                {selectedArticle.excerpt}
              </p>
              <div className="text-gray-600 dark:text-gray-400">
                {selectedArticle.content}
              </div>
            </div>

            {/* Additional Images */}
            {selectedArticle.additionalImages && selectedArticle.additionalImages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Additional Images</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedArticle.additionalImages.map((img, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img src={img.url} alt={img.caption} className="w-full h-48 object-cover" />
                      {img.caption && (
                        <p className="p-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                          {img.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Section */}
            {selectedArticle.status === 'pending_verification' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Verification Notes (Optional)
                  </label>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Add any notes or feedback for the author..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Rejection Reason (Required if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none resize-none"
                    placeholder="Explain why this article is being rejected..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleVerify}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Verify & Approve
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Reject Article
                  </button>
                </div>
              </div>
            )}

            {/* Publish Button for Admin */}
            {selectedArticle.status === 'verified' && user?.role === 'ADMIN' && (
              <button
                onClick={() => handlePublish(selectedArticle.id)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Publish Article
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

