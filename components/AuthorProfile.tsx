
import React, { useState, useEffect } from 'react';
import { User, Article, Doctor, UserRole } from '../types';
import { firebaseDb } from '../services/firebaseDb';
import { db as firestore } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  ChevronLeft, 
  User as UserIcon, 
  MapPin, 
  Star, 
  BookOpen, 
  Award, 
  Calendar, 
  MessageCircle,
  Stethoscope,
  Clock,
  Share2,
  Mail,
  Phone,
  Building,
  GraduationCap,
  Heart,
  Eye,
  ThumbsUp,
  ArrowRight,
  CheckCircle,
  Crown
} from 'lucide-react';
import { useNotification } from './NotificationSystem';

interface AuthorProfileProps {
  authorId: string;
  user: User;
  articles: Article[];
  onBack: () => void;
  onNavigate?: (view: string) => void;
  onBookAppointment?: (doctorId: string) => void;
}

export const AuthorProfile: React.FC<AuthorProfileProps> = ({
  authorId,
  user,
  articles,
  onBack,
  onNavigate,
  onBookAppointment
}) => {
  const { notify } = useNotification();
  const [author, setAuthor] = useState<Doctor | User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorArticles, setAuthorArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0
  });

  useEffect(() => {
    const loadAuthorData = async () => {
      try {
        setLoading(true);
        
        // Try to get doctor data first
        const doctorData = await firebaseDb.getDoctorDetails(authorId);
        
        if (doctorData) {
          const doctor: Doctor = {
            id: doctorData.id,
            name: doctorData.name || 'Doctor',
            role: UserRole.DOCTOR,
            avatar: doctorData.avatar || '',
            email: doctorData.email || '',
            location: doctorData.location || 'Tanzania',
            specialty: doctorData.specialty || 'General Practitioner',
            rating: Number(doctorData.rating) || 5.0,
            price: (doctorData as any).consultationFee || (doctorData as any).consultation_fee || doctorData.price || 0,
            experience: (doctorData as any).experienceYears || (doctorData as any).experience_years || doctorData.experience || 0,
            availability: doctorData.availability || [],
            trustTier: doctorData.trustTier,
            isTrusted: doctorData.isTrusted || false,
            canVerifyArticles: doctorData.canVerifyArticles || false,
            points: doctorData.points || 0,
            bio: doctorData.bio || '',
            workplace: doctorData.workplace || '',
            ratingCount: (doctorData as any).ratingCount || 0
          } as Doctor & { ratingCount?: number };
          setAuthor(doctor);
        } else {
          // Fallback to user data
          const userDoc = await getDoc(doc(firestore, 'users', authorId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userProfile: User = {
              id: userDoc.id,
              name: userData.name || 'User',
              role: userData.role as UserRole || UserRole.PATIENT,
              avatar: userData.avatar || '',
              email: userData.email || '',
              phone: userData.phone,
              location: userData.location,
              points: userData.points || 0
            };
            setAuthor(userProfile);
          }
        }

        // Load author's articles
        const authorArticlesList = articles.filter(a => a.authorId === authorId);
        setAuthorArticles(authorArticlesList);

        // Calculate stats
        const totalViews = authorArticlesList.reduce((sum, a) => sum + (a.views || 0), 0);
        const totalLikes = authorArticlesList.reduce((sum, a) => sum + (a.likes || 0), 0);
        const totalShares = authorArticlesList.reduce((sum, a) => sum + (a.shares || 0), 0);

        setStats({
          totalArticles: authorArticlesList.length,
          totalViews,
          totalLikes,
          totalShares
        });
      } catch (error) {
        console.error('Failed to load author data:', error);
        notify('Failed to load author profile', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadAuthorData();
  }, [authorId, articles, notify]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">Author not found</p>
          <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  const isDoctor = author.role === UserRole.DOCTOR;
  const doctor = isDoctor ? (author as Doctor) : null;

  const handleViewArticle = (articleId: string) => {
    if (onNavigate) {
      onNavigate('resources');
      // Trigger article view in Articles component
      setTimeout(() => {
        const event = new CustomEvent('viewArticle', { detail: { articleId } });
        window.dispatchEvent(event);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white dark:bg-[#0F172A] border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => {
              // For couriers, go back to articles view, for others use onBack
              if (user.role === UserRole.COURIER) {
                if (onNavigate) {
                  onNavigate('articles');
                } else {
                  onBack();
                }
              } else {
                onBack();
              }
            }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </div>

      {/* Hero Section - Ada.com inspired */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-gray-900 dark:via-[#0F172A] dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl bg-gray-100 dark:bg-gray-800">
                  {author.avatar ? (
                    <img 
                      src={author.avatar} 
                      alt={author.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&background=random&size=160`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-teal-400">
                      <UserIcon className="text-white" size={64} />
                    </div>
                  )}
                </div>
                {isDoctor && doctor?.isTrusted && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-2 shadow-lg">
                    <CheckCircle className="text-white" size={20} />
                  </div>
                )}
              </div>
            </div>

            {/* Author Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {author.name}
                </h1>
                {isDoctor && doctor?.trustTier && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    doctor.trustTier === 'VIP' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    doctor.trustTier === 'Premium' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    <Crown size={12} />
                    {doctor.trustTier}
                  </span>
                )}
              </div>

              {isDoctor && (
                <div className="flex flex-wrap items-center gap-4 mb-4 text-gray-600 dark:text-gray-300">
                  {doctor.specialty && (
                    <div className="flex items-center gap-2">
                      <Stethoscope size={18} />
                      <span className="font-medium">{doctor.specialty}</span>
                    </div>
                  )}
                  {doctor.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="text-amber-400 fill-amber-400" size={18} />
                      <span className="font-bold">{doctor.rating.toFixed(1)}</span>
                      {(doctor as any).ratingCount > 0 && (
                        <span className="text-sm text-gray-500">({(doctor as any).ratingCount})</span>
                      )}
                    </div>
                  )}
                  {author.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={18} />
                      <span>{author.location}</span>
                    </div>
                  )}
                </div>
              )}

              {isDoctor && doctor?.bio && (
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed max-w-2xl">
                  {doctor.bio}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {/* Only show Book Consultation for PATIENT and DOCTOR roles, not for COURIER or ADMIN */}
                {isDoctor && onBookAppointment && user.role !== UserRole.COURIER && user.role !== UserRole.ADMIN && (
                  <button
                    onClick={() => onBookAppointment(author.id)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Calendar size={18} />
                    Book Consultation
                  </button>
                )}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${author.name}'s Profile`,
                        text: `Check out ${author.name}'s profile on NexaFya`,
                        url: window.location.href
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      notify('Profile link copied!', 'success');
                    }
                  }}
                  className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-700"
                >
                  <Share2 size={18} />
                  Share Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalArticles}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Articles</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Eye className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalViews.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Views</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Heart className="text-red-600 dark:text-red-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLikes.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Likes</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Share2 className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalShares.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Shares</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Details Section */}
      {isDoctor && doctor && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Professional Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {doctor.workplace && (
                <div className="flex items-start gap-3">
                  <Building className="text-gray-400 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Workplace</p>
                    <p className="font-medium text-gray-900 dark:text-white">{doctor.workplace}</p>
                  </div>
                </div>
              )}
              {doctor.experience > 0 && (
                <div className="flex items-start gap-3">
                  <GraduationCap className="text-gray-400 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Experience</p>
                    <p className="font-medium text-gray-900 dark:text-white">{doctor.experience} years</p>
                  </div>
                </div>
              )}
              {doctor.price > 0 && (
                <div className="flex items-start gap-3">
                  <Award className="text-gray-400 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Consultation Fee</p>
                    <p className="font-medium text-gray-900 dark:text-white">TZS {doctor.price.toLocaleString()}</p>
                  </div>
                </div>
              )}
              {author.email && (
                <div className="flex items-start gap-3">
                  <Mail className="text-gray-400 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{author.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Articles Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Articles by {author.name}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {authorArticles.length} {authorArticles.length === 1 ? 'article' : 'articles'}
          </span>
        </div>

        {authorArticles.length === 0 ? (
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
            <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 dark:text-gray-400">No articles published yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authorArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => handleViewArticle(article.id)}
                className="bg-white dark:bg-[#0F172A] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {article.isPremium && (
                    <div className="absolute top-3 right-3 bg-amber-400 text-black text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <Crown size={12} />
                      Premium
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 block">
                    {article.category}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Eye size={14} />
                        {article.views || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart size={14} />
                        {article.likes || 0}
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {article.readTime} min
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

