
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Article, ArticleImage } from '../types';
import { useNotification } from './NotificationSystem';
import { PAYMENT_METHODS, MOCK_DOCTORS } from '../constants';
import { Search, PenTool, BookOpen, Heart, Clock, User as UserIcon, ChevronLeft, Share2, Bookmark, Sparkles, RefreshCw, Check, Link as LinkIcon, Edit2, Trash2, Crown, Image as ImageIcon, Save, X, Layout, ArrowRight, Eye, Lock, ShieldCheck, AlignLeft, Gift, ShoppingBag, Stethoscope, CreditCard, Smartphone, CheckCircle, ExternalLink, Lightbulb, ChevronDown, Plus, Upload, LayoutGrid, FileText, Flame, Trophy, Loader2, Send, Archive, Activity, Zap, Brain, Baby, HeartPulse } from 'lucide-react';
import { checkSymptoms } from '../services/geminiService';
import { db } from '../services/db';
import PaymentModal from './PaymentModal';
import { db as firestore, storage, storageRefs } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ArticlesProps {
  user: User;
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  viewMode: 'public' | 'manage'; // Controls whether it's the public library or doctor's editor
  onNavigate?: (view: string) => void;
  onViewDoctor?: (doctorId: string) => void;
  onViewAuthor?: (authorId: string) => void;
  initialArticleId?: string | null;
  initialTab?: 'feed' | 'editor' | 'read' | 'preview';
}

export const Articles: React.FC<ArticlesProps> = ({ user, articles, setArticles, viewMode, onNavigate, onViewDoctor, onViewAuthor, initialArticleId, initialTab: propInitialTab }) => {
  const { notify } = useNotification();
  
  // Internal Mode
  const [internalMode, setInternalMode] = useState<'workspace' | 'library'>(viewMode === 'manage' ? 'workspace' : 'library');
  
  const [activeTab, setActiveTab] = useState<'feed' | 'editor' | 'read' | 'preview' | 'bookmarks'>(propInitialTab || (viewMode === 'manage' ? 'editor' : 'feed'));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  // -- Access & Payment State --
  const [unlockedArticles, setUnlockedArticles] = useState<string[]>([]);
  const [paidArticles, setPaidArticles] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [unlockingArticle, setUnlockingArticle] = useState<Article | null>(null);

  // -- Interaction State --
  const [likedArticleIds, setLikedArticleIds] = useState<string[]>([]);
  const [bookmarkedArticleIds, setBookmarkedArticleIds] = useState<string[]>([]);
  const [authorAvatars, setAuthorAvatars] = useState<Record<string, string>>({});

  // -- Editor State --
  const [editId, setEditId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    image: '', // Cover Photo URL
    additionalImages: [] as ArticleImage[], // Array of Image objects
    excerpt: '',
    highlights: '',
    content: '',
    isPremium: false,
    price: 0,
    currency: 'TZS',
    newCategory: '',
    status: 'draft' as 'draft' | 'published' | 'archived'
  });
  
  // Image input state
  const [newImgUrl, setNewImgUrl] = useState('');
  const [newImgCaption, setNewImgCaption] = useState('');

  // Refs for File Upload
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Filter articles
  const categories = ['All', 'General', 'Heart Health', 'Nutrition', 'Mental Health', 'Fitness', 'Pediatrics'];

  const filteredFeed = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          article.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    const isPublished = article.status === 'published';
    return matchesSearch && matchesCategory && isPublished;
  });
  
  // Doctor's Drafts & Published
  const myArticles = articles.filter(a => a.authorId === user.id);

  // Load persistence and paid articles
  useEffect(() => {
      try {
          const liked = localStorage.getItem('likedArticles');
          if (liked) setLikedArticleIds(JSON.parse(liked));
      } catch (e) { console.error("Failed to parse interactions"); }
      
      // Load and listen to paid articles from articleAccess collection
      if (user.id) {
          const accessQuery = query(
              collection(firestore, 'articleAccess'),
              where('userId', '==', user.id)
          );
          
          // Real-time listener for article access
          const unsubscribeAccess = onSnapshot(accessQuery, (snapshot) => {
              const paidIds = snapshot.docs
                  .map(doc => {
                      const data = doc.data();
                      // Check if status is PAID or if transaction is VERIFIED
                      if (data.status === 'PAID' || data.status === 'VERIFIED' || !data.status) {
                          return data.articleId;
                      }
                      return null;
                  })
                  .filter(id => id !== null) as string[];
              
              setPaidArticles(paidIds);
              setUnlockedArticles(prev => [...new Set([...prev, ...paidIds])]);
          }, (error) => {
              console.error('Failed to listen to article access:', error);
          });
          
          // Load and listen to bookmarks
          const bookmarksQuery = query(
              collection(firestore, 'userBookmarks'),
              where('userId', '==', user.id)
          );
          
          const unsubscribeBookmarks = onSnapshot(bookmarksQuery, (snapshot) => {
              const bookmarkIds = snapshot.docs.map(doc => doc.data().articleId);
              setBookmarkedArticleIds(bookmarkIds);
          }, (error) => {
              console.error('Failed to listen to bookmarks:', error);
          });
          
          return () => {
              unsubscribeAccess();
              unsubscribeBookmarks();
          };
      }
  }, [user.id]);

  // Load author avatars
  useEffect(() => {
      const loadAuthorAvatars = async () => {
          const uniqueAuthorIds = [...new Set(articles.map(a => a.authorId))];
          const avatarMap: Record<string, string> = {};
          
          await Promise.all(
              uniqueAuthorIds.map(async (authorId) => {
                  try {
                      // Try doctor collection first
                      const doctorDoc = await getDoc(doc(firestore, 'doctors', authorId));
                      if (doctorDoc.exists() && doctorDoc.data().avatar) {
                          avatarMap[authorId] = doctorDoc.data().avatar;
                          return;
                      }
                      
                      // Fallback to users collection
                      const userDoc = await getDoc(doc(firestore, 'users', authorId));
                      if (userDoc.exists() && userDoc.data().avatar) {
                          avatarMap[authorId] = userDoc.data().avatar;
                      }
                  } catch (error) {
                      console.error(`Failed to load avatar for ${authorId}:`, error);
                  }
              })
          );
          
          setAuthorAvatars(avatarMap);
      };
      
      if (articles.length > 0) {
          loadAuthorAvatars();
      }
  }, [articles]);

  // Handle Deep Link
  useEffect(() => {
      if (initialArticleId) {
          const found = articles.find(a => a.id === initialArticleId);
          if (found) { setSelectedArticle(found); setActiveTab('read'); window.scrollTo(0,0); }
      }
  }, [initialArticleId, articles]);

  // Mode Switching
  useEffect(() => {
    if (viewMode === 'manage') {
        setInternalMode('workspace'); 
        if (propInitialTab) {
            setActiveTab(propInitialTab);
        } else {
            setActiveTab('editor');
        }
    } else {
        setInternalMode('library'); 
        setActiveTab(propInitialTab || 'feed'); 
        setSelectedArticle(null);
    }
  }, [viewMode, propInitialTab]);

  const handleRead = (article: Article) => {
    setSelectedArticle(article);
    setActiveTab('read');
    window.scrollTo(0,0);
  };

  const handleToggleLike = (e: React.MouseEvent, articleId: string) => {
      e.stopPropagation();
      const isLiked = likedArticleIds.includes(articleId);
      const newLikedIds = isLiked ? likedArticleIds.filter(id => id !== articleId) : [...likedArticleIds, articleId];
      setLikedArticleIds(newLikedIds);
      localStorage.setItem('likedArticles', JSON.stringify(newLikedIds));
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, likes: isLiked ? a.likes - 1 : a.likes + 1 } : a));
      if (selectedArticle && selectedArticle.id === articleId) {
          setSelectedArticle(prev => prev ? ({ ...prev, likes: isLiked ? prev.likes - 1 : prev.likes + 1 }) : null);
      }
  };

  const handleToggleBookmark = async (e: React.MouseEvent, article: Article) => {
      e.stopPropagation();
      if (!user?.id || !article?.id) {
          notify('Please login to bookmark articles', 'info');
          return;
      }
      
      const isBookmarked = Array.isArray(bookmarkedArticleIds) && bookmarkedArticleIds.includes(article.id);
      
      try {
          if (isBookmarked) {
              // Remove bookmark
              const bookmarkQuery = query(
                  collection(firestore, 'userBookmarks'),
                  where('userId', '==', user.id),
                  where('articleId', '==', article.id)
              );
              const bookmarkSnapshot = await getDocs(bookmarkQuery);
              
              if (!bookmarkSnapshot.empty && bookmarkSnapshot.docs.length > 0) {
                  await deleteDoc(bookmarkSnapshot.docs[0].ref);
                  setBookmarkedArticleIds(prev => Array.isArray(prev) ? prev.filter(id => id !== article.id) : []);
                  notify('Article removed from bookmarks', 'info');
              }
          } else {
              // Add bookmark
              await addDoc(collection(firestore, 'userBookmarks'), {
                  userId: user.id,
                  articleId: article.id,
                  articleTitle: article.title || 'Untitled',
                  articleImage: article.image || '',
                  articleAuthor: article.authorName || 'Unknown',
                  createdAt: serverTimestamp()
              });
              setBookmarkedArticleIds(prev => Array.isArray(prev) ? [...prev, article.id] : [article.id]);
              notify('Article saved to bookmarks', 'success');
          }
      } catch (error: any) {
          console.error('Bookmark error:', error);
          notify(`Failed to update bookmark: ${error?.message || 'Unknown error'}`, 'error');
      }
  };

  const handleUnlockClick = (article: Article) => { 
    setUnlockingArticle(article);
    setShowPaymentModal(true); 
  };

  // When opening an article, increment views and check access state
  useEffect(() => {
    const run = async () => {
      if (activeTab !== 'read' || !selectedArticle) return;
      try {
        await (db as any).incrementArticleView?.(selectedArticle.id);
        // refresh local state for view count
        setArticles(prev => prev.map(a => a.id === selectedArticle.id ? { ...a, views: (a.views || 0) + 1 } : a));
      } catch {}

      try {
        const accessId = `${selectedArticle.id}_${user.id}`;
        const snap = await getDoc(doc(firestore, 'articleAccess', accessId));
        if (snap.exists()) {
          setUnlockedArticles(prev => prev.includes(selectedArticle.id) ? prev : [...prev, selectedArticle.id]);
        }
      } catch {}
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedArticle?.id, user.id]);
  
  const startEdit = (article: Article) => {
    setInternalMode('workspace'); 
    setEditId(article.id);
    setFormData({
        title: article.title,
        category: article.category,
        image: article.image,
        additionalImages: article.additionalImages || [],
        excerpt: article.excerpt,
        highlights: article.highlights || '',
        content: article.content,
        isPremium: article.isPremium,
        price: article.price || 0,
        currency: article.currency || 'TZS',
        newCategory: '',
        status: article.status || 'draft'
    });
    setActiveTab('editor'); 
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'gallery') => {
      const file = e.target.files?.[0];
      if (file) {
          (async () => {
            try {
              const ext = file.name.split('.').pop() || 'jpg';
              const path = `${storageRefs.articleImages}/${user.id}/${Date.now()}.${ext}`;
              const sRef = storageRef(storage, path);
              await uploadBytes(sRef, file);
              const url = await getDownloadURL(sRef);
              if (type === 'cover') {
                setFormData(prev => ({ ...prev, image: url }));
                notify('Cover image uploaded', 'success');
              } else {
                setNewImgUrl(url);
                notify('Image uploaded. Add caption and click "Add".', 'info');
              }
            } catch (err) {
              console.error(err);
              notify('Upload failed', 'error');
            }
          })();
      }
  };

  const handleAddImage = () => {
      if(newImgUrl) {
          setFormData(prev => ({
              ...prev,
              additionalImages: [...prev.additionalImages, { url: newImgUrl, caption: newImgCaption }]
          }));
          setNewImgUrl('');
          setNewImgCaption('');
          notify('Image added to gallery', 'success');
      }
  };

  const handleRemoveImage = (index: number) => {
      setFormData(prev => ({
          ...prev,
          additionalImages: prev.additionalImages.filter((_, i) => i !== index)
      }));
  };

  const handleDeleteArticle = async (id: string) => {
      if (!confirm("Are you sure you want to delete this article?")) return;
      try {
          await db.deleteArticle(id);
          setArticles(prev => prev.filter(a => a.id !== id));
          notify("Article deleted", "info");
      } catch (e) {
          console.error(e);
          notify("Failed to delete article", "error");
      }
  };

  const handleSaveArticle = async (status: 'draft' | 'published') => {
      if (!formData.title) {
          notify('Title is required', 'error');
          return;
      }
      
      const loadingState = status === 'published' ? setIsPublishing : setIsSaving;
      loadingState(true);
      
      try {
          const readTime = Math.ceil(formData.content.split(' ').length / 200);
          
          const articlePayload = {
              title: formData.title,
              category: formData.category === 'New' ? formData.newCategory : formData.category,
              content: formData.content,
              excerpt: formData.excerpt,
              image: formData.image || 'https://picsum.photos/800/400?random=' + Date.now(),
              authorId: user.id,
              authorName: user.name,
              authorRole: user.role === 'DOCTOR' ? 'Specialist' : 'Contributor',
              isPremium: formData.isPremium,
              price: formData.price,
              currency: formData.currency,
              readTime: readTime,
              status: status,
              additionalImages: formData.additionalImages
          };

          let resultArticle;
          if (editId) {
             resultArticle = await db.updateArticle(editId, articlePayload);
          } else {
             resultArticle = await db.createArticle(articlePayload);
          }

          setArticles(prev => {
              if (editId) return prev.map(a => a.id === editId ? resultArticle : a);
              return [resultArticle, ...prev];
          });

          notify(status === 'published' ? 'Article published successfully!' : 'Draft saved.', 'success');
          
          if (status === 'published') {
              setInternalMode('library');
              // Reset
              setEditId(null);
              setFormData({
                title: '', category: 'General', image: '', additionalImages: [], excerpt: '', highlights: '', content: '',
                isPremium: false, price: 0, currency: 'TZS', newCategory: '', status: 'draft'
              });
          }
      } catch (error) {
          console.error(error);
          notify('Failed to save article', 'error');
      } finally {
          loadingState(false);
      }
  };

  // --- Render Logic ---

  // 1. Reader View (Public)
  if (activeTab === 'read' && selectedArticle) {
    const isAuthor = user.id === selectedArticle.authorId;
    const isUnlocked = unlockedArticles.includes(selectedArticle.id);
    const isPaid = paidArticles.includes(selectedArticle.id);
    const hasAccess = !selectedArticle.isPremium || isAuthor || isUnlocked || isPaid;
    const isLiked = likedArticleIds.includes(selectedArticle.id);
    const authorProfile = MOCK_DOCTORS.find(d => d.id === selectedArticle.authorId);

    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20 relative">
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); setUnlockingArticle(null); }}
          amount={unlockingArticle?.price || selectedArticle.price || 0}
          currency={unlockingArticle?.currency || selectedArticle.currency || 'TZS'}
          description={`Unlock article: ${unlockingArticle?.title || selectedArticle.title}`}
          itemType="article"
          itemId={unlockingArticle?.id || selectedArticle.id}
          recipientId={unlockingArticle?.authorId || selectedArticle.authorId}
          onSuccess={() => notify('Payment submitted. Awaiting verification.', 'info')}
        />
        {/* Reader Nav */}
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-700/50 transition-all">
            <nav className="flex items-center justify-between py-4 px-2">
                <button onClick={() => { setSelectedArticle(null); setActiveTab(internalMode === 'workspace' ? 'editor' : 'feed'); }} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-bold text-sm uppercase tracking-wider">
                    <ChevronLeft size={18} /> Back
                </button>
                <div className="flex gap-3 items-center">
                    {isAuthor && <button onClick={() => startEdit(selectedArticle)} className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-bold flex gap-1"><Edit2 size={14} /> Edit</button>}
                    
                    <button 
                        onClick={(e) => handleToggleBookmark(e, selectedArticle)} 
                        className={`flex items-center gap-1 transition-colors ${bookmarkedArticleIds.includes(selectedArticle.id) ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                        title={bookmarkedArticleIds.includes(selectedArticle.id) ? 'Remove from bookmarks' : 'Save to bookmarks'}
                    >
                        <Bookmark size={20} fill={bookmarkedArticleIds.includes(selectedArticle.id) ? "currentColor" : "none"} />
                    </button>
                    <button onClick={(e) => handleToggleLike(e, selectedArticle.id)} className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}><Heart size={22} fill={isLiked ? "currentColor" : "none"} /><span className="text-xs font-bold">{selectedArticle.likes}</span></button>
                    <button
                      onClick={async () => {
                        await (db as any).incrementArticleShare?.(selectedArticle.id);
                        setArticles(prev => prev.map(a => a.id === selectedArticle.id ? { ...a, shares: (a.shares || 0) + 1 } : a));
                        notify('Thanks for sharing!', 'success');
                      }}
                      className="flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Share"
                    >
                      <Share2 size={20} />
                      <span className="text-xs font-bold">{selectedArticle.shares || 0}</span>
                    </button>
                </div>
            </nav>
        </div>

        <article className="bg-white dark:bg-[#0F172A] md:rounded-[2.5rem] mt-6 overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700/50">
           <div className="relative h-[400px] md:h-[500px] w-full">
              <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full text-white">
                  <span className="inline-block px-3 py-1 bg-teal-600 text-white text-xs font-bold uppercase tracking-widest rounded-full mb-4">{selectedArticle.category}</span>
                  <h1 className="text-3xl md:text-5xl font-display font-bold leading-tight mb-4 shadow-black/20 drop-shadow-lg">{selectedArticle.title}</h1>
                  <div className="flex items-center gap-4 text-sm font-medium opacity-90">
                      <div className="flex items-center gap-2"><Clock size={16} /> {selectedArticle.readTime} min read</div><span>•</span><span>{selectedArticle.date}</span>
                  </div>
              </div>
           </div>

           <div className="p-8 md:p-16 max-w-3xl mx-auto">
              <div className="flex justify-between items-center pb-8 border-b border-gray-100 dark:border-gray-700 mb-10">
                  <div className="flex items-center gap-4">
                      <div 
                          className="relative cursor-pointer group"
                          onClick={(e) => {
                              e.stopPropagation();
                              if (onViewAuthor) {
                                  onViewAuthor(selectedArticle.authorId);
                              }
                          }}
                      >
                          <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-emerald-400 group-hover:scale-110 transition-transform">
                              <div className="w-full h-full rounded-full border-2 border-white dark:border-gray-900 overflow-hidden bg-gray-100">
                                  {authorAvatars[selectedArticle.authorId] ? (
                                      <img 
                                          src={authorAvatars[selectedArticle.authorId]} 
                                          alt={selectedArticle.authorName} 
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedArticle.authorName)}&background=random&size=56`;
                                          }}
                                      />
                                  ) : authorProfile ? (
                                      <img src={authorProfile.avatar} alt={selectedArticle.authorName} className="w-full h-full object-cover" />
                                  ) : (
                                      <UserIcon className="w-full h-full p-3 text-gray-400" />
                                  )}
                              </div>
                          </div>
                      </div>
                      <div 
                          className="cursor-pointer group"
                          onClick={(e) => {
                              e.stopPropagation();
                              if (onViewAuthor) {
                                  onViewAuthor(selectedArticle.authorId);
                              }
                          }}
                      >
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{selectedArticle.authorName}</h4>
                          <div className="flex items-center gap-2 mt-0.5"><p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{selectedArticle.authorRole}</p></div>
                      </div>
                  </div>
              </div>

              <div className="prose dark:prose-invert max-w-none prose-lg prose-p:font-sans prose-headings:font-display prose-headings:font-bold prose-a:text-blue-600">
                 <p className="lead text-xl text-gray-500 dark:text-gray-300 font-display italic mb-8">{selectedArticle.excerpt}</p>
                 
                 {hasAccess ? (
                     <>
                        <div className="whitespace-pre-line text-gray-800 dark:text-gray-200 leading-8">{selectedArticle.content}</div>
                        
                        {/* Additional Images Gallery */}
                        {selectedArticle.additionalImages && selectedArticle.additionalImages.length > 0 && (
                            <div className="mt-12 space-y-8">
                                <h3 className="text-2xl font-display font-bold">Gallery</h3>
                                <div className="grid gap-8">
                                    {selectedArticle.additionalImages.map((img, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <img src={img.url} alt={img.caption} className="w-full rounded-2xl shadow-md" />
                                            {img.caption && <p className="text-sm text-gray-500 text-center italic">{img.caption}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                     </>
                 ) : (
                      <div className="relative py-12 text-center">
                          <div className="text-gray-800 dark:text-gray-200 leading-8 opacity-30 blur-[2px] h-32 overflow-hidden select-none">{selectedArticle.content ? selectedArticle.content.substring(0, 300) : "Lorem ipsum..."}</div>
                          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-gray-800 dark:via-gray-800/80 z-10 flex flex-col items-center justify-center p-8">
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-4 shadow-sm animate-bounce">
                              <Lock size={32} />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">Premium Content</h3>
                            <p className="text-gray-500 mb-8 max-w-md">Unlock full access for just {selectedArticle.currency} {selectedArticle.price?.toLocaleString()}.</p>
                            <button onClick={() => handleUnlockClick(selectedArticle)} className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold flex items-center gap-2 hover:transform hover:scale-105 transition-all shadow-lg">
                              <Crown size={18} className="text-amber-400" fill="currentColor"/> Unlock Now
                            </button>
                          </div>
                      </div>
                 )}
              </div>
           </div>
        </article>
      </div>
    );
  }

  // 3. Library View - Redesigned
  if (internalMode === 'library') {
      return (
        <div className="space-y-12 animate-in fade-in duration-500">
          {viewMode === 'manage' && (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Public Articles</h2>
                <p className="text-sm text-gray-500">Browse the library. Use Exit to return to My Workspace.</p>
              </div>
              <button
                onClick={() => { setInternalMode('workspace'); setActiveTab('editor'); }}
                className="px-6 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold"
              >
                Exit to My Workspace
              </button>
            </div>
          )}
          
          {/* Featured Categories (Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                  { name: 'Heart', icon: HeartPulse, color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' },
                  { name: 'Mind', icon: Brain, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' },
                  { name: 'Fitness', icon: Zap, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
                  { name: 'Child', icon: Baby, color: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400' },
              ].map((cat, i) => (
                  <button 
                    key={i}
                    onClick={() => setSelectedCategory(cat.name === 'Heart' ? 'Heart Health' : cat.name === 'Mind' ? 'Mental Health' : cat.name === 'Child' ? 'Pediatrics' : 'Fitness')}
                    className={`p-6 rounded-3xl ${cat.color} hover:opacity-80 transition-opacity flex flex-col items-center justify-center gap-3`}
                  >
                      <cat.icon size={32} />
                      <span className="font-bold text-sm">{cat.name}</span>
                  </button>
              ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map(c => (
                  <button key={c} onClick={() => setSelectedCategory(c)} className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${selectedCategory === c ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-[#0F172A] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700/50 hover:border-teal-300'}`}>{c}</button>
              ))}
          </div>

          {/* Featured Article (Top One) - Only show on feed tab */}
          {activeTab === 'feed' && filteredFeed.length > 0 && (
              <div onClick={() => handleRead(filteredFeed[0])} className="cursor-pointer group relative rounded-[2.5rem] overflow-hidden aspect-[16/9] md:aspect-[21/9]">
                  <img src={filteredFeed[0].image} alt={filteredFeed[0].title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <button
                      onClick={(e) => handleToggleBookmark(e, filteredFeed[0])}
                      className={`absolute top-4 right-4 p-2.5 backdrop-blur-sm rounded-full transition-colors z-10 ${
                          bookmarkedArticleIds.includes(filteredFeed[0].id)
                              ? 'bg-blue-600/90 text-white'
                              : 'bg-white/20 hover:bg-white/30 text-white'
                      }`}
                      title={bookmarkedArticleIds.includes(filteredFeed[0].id) ? 'Remove from bookmarks' : 'Save to bookmarks'}
                  >
                      <Bookmark size={18} fill={bookmarkedArticleIds.includes(filteredFeed[0].id) ? "currentColor" : "none"} />
                  </button>
                  <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
                      <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest rounded-full mb-4 border border-white/30">{filteredFeed[0].category}</span>
                      <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-2 max-w-3xl">{filteredFeed[0].title}</h2>
                      <p className="text-white/80 line-clamp-2 max-w-2xl text-sm md:text-base">{filteredFeed[0].excerpt}</p>
                  </div>
              </div>
          )}

          {/* Tabs for Feed/Bookmarks */}
          <div className="flex gap-2 mb-6 mt-8">
              <button 
                  onClick={() => setActiveTab('feed')} 
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'feed' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              >
                  All Articles
              </button>
              <button 
                  onClick={() => setActiveTab('bookmarks')} 
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'bookmarks' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              >
                  <Bookmark size={16} fill={activeTab === 'bookmarks' ? "currentColor" : "none"} />
                  Bookmarks ({bookmarkedArticleIds.length})
              </button>
          </div>

          {/* Grid of Articles */}
          {activeTab === 'bookmarks' ? (
              <div>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-6">Saved Articles</h3>
                  {bookmarkedArticleIds.length === 0 ? (
                      <div className="text-center py-12 bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50">
                          <Bookmark className="mx-auto text-gray-300 mb-4" size={48} />
                          <p className="text-gray-500 dark:text-gray-400 mb-2">No bookmarked articles yet</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">Click the bookmark icon on any article to save it here</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {articles
                              .filter(article => bookmarkedArticleIds.includes(article.id))
                              .map(article => (
                                  <div key={article.id} onClick={() => handleRead(article)} className="group cursor-pointer flex flex-col h-full bg-white dark:bg-[#0F172A] rounded-3xl p-4 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all hover:-translate-y-1">
                                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-700">
                                          <img src={article.image} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                          {article.isPremium && <div className="absolute top-3 right-3 bg-amber-400 text-black text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm"><Crown size={10} /> Premium</div>}
                                          <button
                                              onClick={(e) => handleToggleBookmark(e, article)}
                                              className="absolute top-3 left-3 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                              title="Remove from bookmarks"
                                          >
                                              <Bookmark size={14} fill="currentColor" className="text-blue-600" />
                                          </button>
                                      </div>
                                      <div className="flex-1 flex flex-col">
                                          <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2">{article.category}</span>
                                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-snug">{article.title}</h3>
                                          <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">{article.excerpt}</p>
                                          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                              <div 
                                                  className="flex items-center gap-2 cursor-pointer group"
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (onViewAuthor) {
                                                          onViewAuthor(article.authorId);
                                                      }
                                                  }}
                                              >
                                                  <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                                                      {authorAvatars[article.authorId] ? (
                                                          <img 
                                                              src={authorAvatars[article.authorId]} 
                                                              alt={article.authorName}
                                                              className="w-full h-full object-cover"
                                                              onError={(e) => {
                                                                  const target = e.target as HTMLImageElement;
                                                                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(article.authorName)}&background=random&size=24`;
                                                              }}
                                                          />
                                                      ) : (
                                                          <img 
                                                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(article.authorName)}&background=random&size=24`} 
                                                              alt={article.authorName}
                                                              className="w-full h-full object-cover"
                                                          />
                                                      )}
                                                  </div>
                                                  <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{article.authorName}</span>
                                              </div>
                                              <span className="text-xs text-gray-400">{article.readTime} min</span>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                      </div>
                  )}
              </div>
          ) : (
              <div>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-6">Latest Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredFeed.slice(1).map(article => (
                            <div key={article.id} onClick={() => handleRead(article)} className="group cursor-pointer flex flex-col h-full bg-white dark:bg-[#0F172A] rounded-3xl p-4 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all hover:-translate-y-1">
                                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-700">
                                    <img src={article.image} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    {article.isPremium && <div className="absolute top-3 right-3 bg-amber-400 text-black text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm"><Crown size={10} /> Premium</div>}
                                    <button
                                        onClick={(e) => handleToggleBookmark(e, article)}
                                        className={`absolute top-3 left-3 p-2 backdrop-blur-sm rounded-full transition-colors ${
                                            bookmarkedArticleIds.includes(article.id)
                                                ? 'bg-blue-600/90 text-white'
                                                : 'bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                        }`}
                                        title={bookmarkedArticleIds.includes(article.id) ? 'Remove from bookmarks' : 'Save to bookmarks'}
                                    >
                                        <Bookmark size={14} fill={bookmarkedArticleIds.includes(article.id) ? "currentColor" : "none"} />
                                    </button>
                                </div>
                                <div className="flex-1 flex flex-col">
                                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2">{article.category}</span>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-snug">{article.title}</h3>
                                    <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">{article.excerpt}</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer group"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onViewAuthor) {
                                                    onViewAuthor(article.authorId);
                                                }
                                            }}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                                                {authorAvatars[article.authorId] ? (
                                                    <img 
                                                        src={authorAvatars[article.authorId]} 
                                                        alt={article.authorName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(article.authorName)}&background=random&size=24`;
                                                        }}
                                                    />
                                                ) : (
                                                    <img 
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(article.authorName)}&background=random&size=24`} 
                                                        alt={article.authorName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{article.authorName}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">{article.readTime} min</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                  </div>
              </div>
          )}
        </div>
      );
  }

  // 4. Workspace (Manage/Create)
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
            <div className="flex bg-white dark:bg-[#0F172A] p-1.5 rounded-2xl w-fit shadow-sm border border-gray-100 dark:border-gray-700/50">
                <button onClick={() => setInternalMode('workspace')} className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-blue-600 text-white shadow-md"><LayoutGrid size={16} /> My Workspace</button>
                <button onClick={() => setInternalMode('library')} className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50"><BookOpen size={16} /> Public Library</button>
            </div>
        </div>

        {activeTab === 'editor' ? (
            <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700/50 mt-8">
                {/* ... Editor View (Kept functionally same but wrapped in new style) ... */}
                {/* Simplified Editor UI Structure for brevity in this response, functionally identical to previous file but ensuring correct imports/state usage */}
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
                        {editId ? 'Edit Article' : 'Create New Article'}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => handleSaveArticle('draft')} disabled={isSaving} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 flex items-center gap-2">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Draft
                        </button>
                        <button onClick={() => handleSaveArticle('published')} disabled={isPublishing} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg flex items-center gap-2">
                            {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Publish
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Title</label>
                            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 text-xl font-display font-bold rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Article Headline" />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Content</label>
                            <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-6 h-[500px] rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed text-lg font-sans" placeholder="Start writing your article..." />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Cover Image</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={formData.image} 
                                    onChange={e => setFormData({...formData, image: e.target.value})} 
                                    className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                                    placeholder="https://... or upload" 
                                />
                                <button 
                                    onClick={() => coverInputRef.current?.click()}
                                    className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-3 rounded-xl transition-colors border border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300"
                                >
                                    <Upload size={20} />
                                </button>
                                <input 
                                    type="file" 
                                    ref={coverInputRef} 
                                    className="hidden" 
                                    onChange={(e) => handleImageUpload(e, 'cover')} 
                                    accept="image/*"
                                />
                            </div>
                            {formData.image && <img src={formData.image} className="mt-2 w-full h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-700" />}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Excerpt</label>
                            <textarea value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} className="w-full p-3 h-24 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm" placeholder="Short summary..." />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Category</label>
                            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Free/Premium Toggle and Price */}
                        <div className="p-4 border border-gray-200 dark:border-gray-700/50 rounded-xl bg-gray-50 dark:bg-[#0A1B2E]/50">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Article Type</label>
                                    <p className="text-xs text-gray-400">Choose if this article is free or premium</p>
                                </div>
                                <button 
                                    onClick={() => setFormData({...formData, isPremium: !formData.isPremium})}
                                    className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out flex items-center ${formData.isPremium ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 flex items-center justify-center ${formData.isPremium ? 'translate-x-6' : 'translate-x-0'}`}>
                                        {formData.isPremium && <Crown size={14} className="text-amber-600" />}
                                    </div>
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${formData.isPremium ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                    {formData.isPremium ? 'Premium' : 'Free'}
                                </span>
                            </div>
                            {formData.isPremium && (
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Price</label>
                                        <div className="flex gap-2">
                                            <select 
                                                value={formData.currency} 
                                                onChange={e => setFormData({...formData, currency: e.target.value})} 
                                                className="w-20 p-2 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            >
                                                <option value="TZS">TZS</option>
                                                <option value="USD">USD</option>
                                            </select>
                                            <input 
                                                type="number" 
                                                value={formData.price || ''} 
                                                onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} 
                                                className="flex-1 p-2 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Additional Images Gallery */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Additional Photos</label>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input 
                                        type="file" 
                                        ref={galleryInputRef} 
                                        className="hidden" 
                                        onChange={(e) => handleImageUpload(e, 'gallery')} 
                                        accept="image/*"
                                    />
                                    <button 
                                        onClick={() => galleryInputRef.current?.click()}
                                        className="flex-1 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A0F1C] hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400"
                                    >
                                        <ImageIcon size={18} />
                                        Upload Photo
                                    </button>
                                </div>
                                
                                {newImgUrl && (
                                    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-[#0A0F1C]">
                                        <img src={newImgUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
                                        <input 
                                            type="text" 
                                            value={newImgCaption} 
                                            onChange={e => setNewImgCaption(e.target.value)} 
                                            className="w-full p-2 mb-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F172A] text-sm" 
                                            placeholder="Image caption (optional)"
                                        />
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handleAddImage}
                                                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                                            >
                                                Add to Gallery
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setNewImgUrl('');
                                                    setNewImgCaption('');
                                                }}
                                                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {formData.additionalImages.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-500">Gallery ({formData.additionalImages.length} photos)</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {formData.additionalImages.map((img, idx) => (
                                                <div key={idx} className="relative group">
                                                    <img src={img.url} alt={img.caption || `Image ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                                                    <button 
                                                        onClick={() => handleRemoveImage(idx)}
                                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                    {img.caption && (
                                                        <p className="text-xs text-gray-500 mt-1 truncate">{img.caption}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            // My Articles List
            <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Your Articles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myArticles.map(article => (
                        <div key={article.id} className="bg-white dark:bg-[#0F172A] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 group relative">
                            <div className="aspect-video rounded-xl bg-gray-100 mb-4 overflow-hidden">
                                <img src={article.image} className="w-full h-full object-cover" />
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{article.title}</h4>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>{new Date(article.date).toLocaleDateString()}</span>
                                <span className={`px-2 py-0.5 rounded capitalize ${
                                    article.status === 'published' ? 'bg-green-100 text-green-700' : 
                                    article.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                                }`}>{article.status}</span>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button onClick={() => startEdit(article)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100">Edit</button>
                                <button onClick={() => handleDeleteArticle(article.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center justify-center">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => {
                        setEditId(null);
                        setFormData({
                            title: '', category: 'General', image: '', additionalImages: [], excerpt: '', highlights: '', content: '',
                            isPremium: false, price: 0, currency: 'TZS', newCategory: '', status: 'draft'
                        });
                        setActiveTab('editor');
                    }} className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors min-h-[250px]">
                        <Plus size={32} className="mb-2" />
                        <span className="font-bold">Create New</span>
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
