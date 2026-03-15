"use client";

// components/admin/RecentPosts.tsx
// 📝 عرض آخر المنشورات - نسخة آمنة مع تحويل البيانات
// @version 6.3.0
// @lastUpdated 2026

import { useState, useEffect, useCallback } from "react";
import { 
  FaTrash, 
  FaEye, 
  FaUserCircle, 
  FaClock, 
  FaHeart, 
  FaComment, 
  FaExclamationTriangle,
  FaArrowLeft
} from "react-icons/fa";
import adminService from "@/services/adminService";
import { Post } from "@/types/Post"; // ✅ استيراد النوع المحول
import { secureLog, sanitizeImageUrl } from "@/utils/security";
import { useRouter } from "next/navigation";
import styles from "./RecentPosts.module.css";

export default function RecentPosts() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // تحميل البيانات
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getPosts({ limit: 5 });
      // ✅ البيانات الآن آمنة ومحولة عبر toPostArray داخل adminService
      const postsData = response.data || [];
      setPosts(postsData);
    } catch (err) {
      setError("حدث خطأ أثناء جلب البيانات. يرجى المحاولة لاحقاً.");
      secureLog.error("Error fetching recent posts", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // تنسيق التاريخ
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return "غير معروف";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "تاريخ غير صالح";
    
    return new Intl.RelativeTimeFormat('ar', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 
      'day'
    ).replace('بعد', 'منذ');
  }, []);

  // حذف المنشور
  const confirmDelete = async () => {
    if (!selectedPost) return;
    try {
      await adminService.deletePost(selectedPost._id);
      setPosts(prev => prev.filter(p => p._id !== selectedPost._id));
      secureLog.info(`Post ${selectedPost._id} deleted successfully`);
    } catch (err) {
      setError("فشل حذف المنشور");
    } finally {
      setShowConfirm(false);
      setSelectedPost(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>جاري مزامنة أحدث البيانات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <FaExclamationTriangle className={styles.errorIcon} />
        <p>{error}</p>
        <button onClick={loadPosts} className={styles.retryButton}>إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <h2 className={styles.title}>أحدث المنشورات</h2>
        </div>
        <button onClick={() => router.push('/admin/posts')} className={styles.viewAllButton}>
          عرض السجل الكامل <FaArrowLeft />
        </button>
      </header>

      <div className={styles.postList}>
        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>لا توجد منشورات مسجلة حالياً</p>
          </div>
        ) : (
          posts.map((post) => {
            // ✅ استخراج بيانات الكاتب بشكل آمن
            const author = typeof post.author === 'object' ? post.author : null;
            return (
              <article key={post._id} className={styles.postItem}>
                <div className={styles.postHeader}>
                  <div className={styles.authorBadge}>
                    {author?.avatar ? (
                      <img 
                        src={sanitizeImageUrl(author.avatar)} 
                        alt={author.name} 
                        className={styles.avatarImg}
                      />
                    ) : <FaUserCircle className={styles.avatarPlaceholder} />}
                    <span className={styles.authorName}>{author?.name || "مستخدم مجهول"}</span>
                  </div>
                  <time className={styles.timestamp}>
                    <FaClock /> {formatDate(post.createdAt)}
                  </time>
                </div>

                <p className={styles.postContent}>{post.content}</p>

                <div className={styles.footer}>
                  <div className={styles.statsGroup}>
                    {/* ✅ عدد الإعجابات - آمن */}
                    <span className={styles.statItem} title="إجمالي الإعجابات">
                      <FaHeart className={styles.iconLike} /> {post.reactions?.length || 0}
                    </span>

                    {/* ✅ عدد التعليقات - آمن */}
                    <span className={styles.statItem} title="عدد التعليقات">
                      <FaComment className={styles.iconComment} /> {post.comments?.length || 0}
                    </span>
                    
                    {/* ✅ عدد المشاركات - آمن */}
                    {post.shares && post.shares.length > 0 && (
                      <span className={styles.statItem} title="عدد المشاركات">
                        <small>مشاركة: {post.shares.length}</small>
                      </span>
                    )}
                  </div>

                  <div className={styles.actionGroup}>
                    <button 
                      onClick={() => router.push(`/posts/${post._id}`)}
                      className={`${styles.iconBtn} ${styles.viewBtn}`}
                      aria-label="معاينة المنشور"
                      title="معاينة"
                    >
                      <FaEye />
                    </button>
                    
                    <button 
                      onClick={() => { 
                        setSelectedPost(post); 
                        setShowConfirm(true); 
                      }}
                      className={`${styles.iconBtn} ${styles.deleteBtn}`}
                      aria-label="حذف المنشور"
                      title="حذف"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal التأكيد */}
      {showConfirm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h3>تأكيد إجراء الحذف</h3>
            <p>هل أنت متأكد من رغبتك في حذف هذا المنشور نهائياً؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className={styles.modalActions}>
              <button onClick={confirmDelete} className={styles.confirmDelete}>حذف نهائي</button>
              <button onClick={() => setShowConfirm(false)} className={styles.cancelDelete}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}