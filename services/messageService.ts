// services/messageService.ts
// 💬 مسؤول: إدارة الرسائل والمحادثات - متوافقة مع نظام API v5.0
// @version 6.0.0 | Production Ready

import api, { ApiResponse } from "@/services/api"; // ✅ استخدام النوع الموحد
import {
  Message,
  Conversation,
  SearchUserResult,
  SendMessageData,
  toMessageArray,
  toConversationArray,
  toMessage,
} from "@/types/Message";
import { SECURITY_CONFIG, MESSAGES } from "@/utils/constants";
import { sanitizeInput, secureLog } from "@/utils/security";

// ============================================================================
// خدمة الرسائل (Message Service)
// ============================================================================

const messageService = {

  // ========================================================================
  // المحادثات (Conversations)
  // ========================================================================

  /**
   * جلب سجل المحادثة مع مستخدم معين
   */
  async getConversation(
    receiverId: string,
    options?: { signal?: AbortSignal }
  ): Promise<Message[]> {
    try {
      secureLog.info('📥 جلب المحادثة', { receiverId });

      const response = await api.get<ApiResponse<Message[]>>(
        `/messages/conversation/${receiverId}`, 
        { signal: options?.signal } // Axios يدعم الـ signal مباشرة في النسخ الحديثة
      );

      // تحويل البيانات الخام إلى مصفوفة رسائل آمنة (Typescript Mapping)
      return toMessageArray(response.data?.data || []);
      
    } catch (error: any) {
      if (axios.isCancel(error)) throw error; // تجاهل أخطاء الإلغاء المتعمدة
      secureLog.error('❌ فشل جلب المحادثة', error);
      return [];
    }
  },

  /**
   * جلب جميع المحادثات النشطة للمستخدم الحالي
   */
  async getUserConversations(): Promise<Conversation[]> {
    try {
      secureLog.info('📥 جلب قائمة المحادثات');

      const response = await api.get<ApiResponse<Conversation[]>>(`/messages/user`);

      const conversations = response.data?.data || [];
      const safeConversations = toConversationArray(conversations);

      secureLog.info(`✅ تم جلب ${safeConversations.length} محادثة`);
      return safeConversations;
    } catch (error: any) {
      secureLog.error('❌ فشل جلب المحادثات', error);
      return [];
    }
  },

  // ========================================================================
  // إرسال وإدارة الرسائل (Messages)
  // ========================================================================

  /**
   * إرسال رسالة نصية جديدة
   */
  async sendMessage(text: string, receiverId: string): Promise<Message> {
    try {
      const cleanText = sanitizeInput(text.trim());

      if (cleanText.length > SECURITY_CONFIG.MAX_CONTENT_LENGTH) {
        throw new Error('الرسالة طويلة جداً');
      }

      const payload: SendMessageData = {
        receiver: receiverId,
        text: cleanText,
      };

      secureLog.info('📤 إرسال رسالة جاري...');
      const response = await api.post<ApiResponse<Message>>(`/messages`, payload);
      
      if (response.data?.success) {
        secureLog.info('✅ تم الإرسال بنجاح');
        return toMessage(response.data.data);
      }
      
      throw new Error(MESSAGES.ERRORS.DEFAULT);
    } catch (error: any) {
      secureLog.error('❌ فشل إرسال الرسالة', error);
      throw error.userMessage || error.response?.data?.message || MESSAGES.ERRORS.DEFAULT;
    }
  },

  /**
   * تحديث الرسائل لتصبح "مقروءة"
   */
  async markMessagesAsRead(senderId: string): Promise<void> {
    try {
      await api.patch(`/messages/read/${senderId}`);
      secureLog.info('✅ تم تحديث حالة القراءة');
    } catch (error: any) {
      secureLog.error('❌ فشل تحديث حالة القراءة', error);
    }
  },

  /**
   * حذف رسالة معينة
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      secureLog.info('🗑️ حذف رسالة...', { messageId });
      const response = await api.delete<ApiResponse<null>>(`/messages/${messageId}`);
      
      if (!response.data?.success) throw new Error('فشل الحذف');
    } catch (error: any) {
      secureLog.error('❌ فشل حذف الرسالة', error);
      throw error.userMessage || 'لا يمكن حذف الرسالة حالياً';
    }
  },

  // ========================================================================
  // البحث المتقدم (Search)
  // ========================================================================

  /**
   * البحث عن مستخدمين لبدء محادثة جديدة
   */
  async searchUsers(
    query: string,
    options?: { signal?: AbortSignal }
  ): Promise<SearchUserResult[]> {
    try {
      const cleanQuery = query.trim();
      if (cleanQuery.length < 2) return [];

      const response = await api.get<ApiResponse<SearchUserResult[]>>(
        `/users/search?q=${encodeURIComponent(cleanQuery)}`,
        { signal: options?.signal }
      );

      return response.data?.data || [];
    } catch (error: any) {
      if (axios.isCancel(error)) throw error;
      secureLog.error('❌ فشل البحث', error);
      return [];
    }
  },

  /**
   * إحصائيات سريعة للرسائل
   */
  async getQuickStats(): Promise<{ total: number; unread: number }> {
    try {
      const conversations = await this.getUserConversations();
      return {
        total: conversations.reduce((acc, c) => acc + (c.messagesCount || 0), 0),
        unread: conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
      };
    } catch {
      return { total: 0, unread: 0 };
    }
  }
};

export default messageService;