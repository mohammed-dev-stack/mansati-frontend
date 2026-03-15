// services/postService.ts
// 📝 خدمة المنشورات - متوافقة مع نظام API v5.0 ومعالجة الميديا
// @version 4.0.0 | Production Ready

import api, { ApiResponse } from "./api"; // ✅ استخدام النوع الموحد
import { Post, toPost, toPostArray } from "@/types/Post";
import { SECURITY_CONFIG, MESSAGES } from "@/utils/constants";
import { sanitizeInput, secureLog } from "@/utils/security";

// ============================================================================
// دوال التحقق المسبق (Validation Helpers)
// ============================================================================

const validatePostData = (formData: FormData): void => {
  const content = formData.get('content') as string;
  const media = formData.getAll('media') as File[];
  
  if (content && content.length > SECURITY_CONFIG.MAX_CONTENT_LENGTH) {
    throw new Error(`المحتوى طويل جداً (الحد الأقصى ${SECURITY_CONFIG.MAX_CONTENT_LENGTH} حرف)`);
  }
  
  media.forEach(file => {
    if (file instanceof File) {
      if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
        throw new Error(`الملف ${file.name} كبير جداً (الحد الأقصى 10MB)`);
      }
      
      const isImage = SECURITY_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type);
      const isVideo = SECURITY_CONFIG.ALLOWED_VIDEO_TYPES.includes(file.type);
      
      if (!isImage && !isVideo) {
        throw new Error('نوع الملف غير مدعوم');
      }
    }
  });
};

// ============================================================================
// خدمة المنشورات (Post Service)
// ============================================================================

const postService = {

  /**
   * ✅ جلب جميع منشورات الصفحة الرئيسية
   */
  async getAll(): Promise<Post[]> {
    try {
      secureLog.info('📥 جلب المنشورات العامة...');
      const response = await api.get<ApiResponse<Post[]>>("/posts");
      
      return toPostArray(response.data?.data || []);
    } catch (error: any) {
      secureLog.error('❌ فشل جلب المنشورات', error);
      return []; // إرجاع مصفوفة فارغة لضمان عدم تعطل الواجهة
    }
  },

  /**
   * ✅ جلب منشورات مستخدم معين (للملف الشخصي)
   */
  async getByUser(userId: string): Promise<Post[]> {
    try {
      secureLog.info(`📥 جلب منشورات المستخدم: ${userId}`);
      const response = await api.get<ApiResponse<Post[]>>(`/posts/user/${userId}`);
      
      return toPostArray(response.data?.data || []);
    } catch (error: any) {
      secureLog.error('❌ فشل جلب منشورات المستخدم', error);
      return [];
    }
  },

  /**
   * ✅ إنشاء منشور جديد (يدعم النصوص والميديا)
   */
  async create(formData: FormData): Promise<Post> {
    try {
      validatePostData(formData);
      
      // تأمين النص قبل الإرسال
      const content = formData.get('content') as string;
      if (content) {
        formData.set('content', sanitizeInput(content.trim()));
      }

      secureLog.info('📤 جاري رفع المنشور والميديا...');
      const response = await api.post<ApiResponse<Post>>("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (response.data?.success) {
        secureLog.info('✅ تم إنشاء المنشور بنجاح');
        return toPost(response.data.data);
      }
      
      throw new Error(MESSAGES.ERRORS.DEFAULT);
    } catch (error: any) {
      secureLog.error('❌ فشل إنشاء المنشور', error);
      throw error.userMessage || error.message || MESSAGES.ERRORS.DEFAULT;
    }
  },

  /**
   * ✅ إضافة تفاعل (Like/Love/etc)
   */
  async addReaction(postId: string, type: string): Promise<Post> {
    try {
      const response = await api.post<ApiResponse<Post>>(
        `/posts/${postId}/react`,
        { type }
      );
      return toPost(response.data.data);
    } catch (error: any) {
      secureLog.error('❌ فشل التفاعل', error);
      throw error.userMessage || MESSAGES.ERRORS.DEFAULT;
    }
  },

  /**
   * ✅ إضافة تعليق جديد
   */
  async addComment(postId: string, text: string): Promise<Post> {
    try {
      if (text.trim().length > SECURITY_CONFIG.MAX_COMMENT_LENGTH) {
        throw new Error(`التعليق طويل جداً`);
      }

      const response = await api.post<ApiResponse<Post>>(
        `/posts/${postId}/comment`,
        { text: sanitizeInput(text.trim()) }
      );
      
      return toPost(response.data.data);
    } catch (error: any) {
      secureLog.error('❌ فشل إضافة التعليق', error);
      throw error.userMessage || error.message || MESSAGES.ERRORS.DEFAULT;
    }
  },

  /**
   * ✅ مشاركة المنشور (Share)
   */
  async addShare(postId: string): Promise<Post> {
    try {
      const response = await api.post<ApiResponse<Post>>(`/posts/${postId}/share`);
      return toPost(response.data.data);
    } catch (error: any) {
      secureLog.error('❌ فشل المشاركة', error);
      throw error.userMessage || MESSAGES.ERRORS.DEFAULT;
    }
  },

  /**
   * ✅ حذف المنشور
   */
  async delete(id: string): Promise<void> {
    try {
      secureLog.info(`🗑️ حذف المنشور: ${id}`);
      const response = await api.delete<ApiResponse<null>>(`/posts/${id}`);
      
      if (!response.data?.success) throw new Error('فشل حذف المنشور');
    } catch (error: any) {
      secureLog.error('❌ فشل حذف المنشور', error);
      throw error.userMessage || MESSAGES.ERRORS.DEFAULT;
    }
  }
};

export default postService;