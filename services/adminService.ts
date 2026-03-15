// services/adminService.ts
// 👑 مسؤول: خدمة لوحة التحكم والمهام الإدارية - نسخة متوافقة مع API v5.0
// @version 3.1.0

import api, { ApiResponse } from "./api"; // ✅ استيراد ApiResponse الموحد
import { User } from "@/types/User";
import { secureLog, sanitizeInput, validateDateRange } from "@/utils/security";
import { MESSAGES } from "@/utils/constants";

// ============================================================================
// أنواع البيانات الخاصة بالخدمة (Interfaces)
// ============================================================================

export interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalMessages: number;
  totalNotifications: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
  newPostsToday: number;
  adminsCount: number;
  usersGrowth: number;
  postsGrowth: number;
}

export interface SystemHealth {
  status: string;
  uptime: number;
  uptimeFormatted: string;
  timestamp: string;
  database: string;
  memory: { rss: string; heapTotal: string; heapUsed: string; external: string };
  cpu: { user: number; system: number };
  nodeVersion: string;
  platform: string;
}

export interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalPosts: number;
    totalMessages: number;
    totalNotifications: number;
    activeUsersToday: number;
    newUsersToday: number;
    newPostsToday: number;
  };
  trends: { usersGrowth: number; postsGrowth: number; messagesGrowth: number };
  charts: {
    contentDistribution: Array<{ name: string; value: number }>;
    dailyActiveUsers: Array<{ date: string; count: number }>;
  };
  systemHealth: { status: string; responseTime: number; cpuUsage: number; memoryUsage: number };
}

// ============================================================================
// دوال مساعدة (Helper Functions)
// ============================================================================

const buildQueryString = (params: Record<string, any>): string => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

// ============================================================================
// خدمة الأدمن (Admin Service)
// ============================================================================

const adminService = {
  
  /**
   * ✅ جلب إحصائيات لوحة التحكم
   */
  async getStats(): Promise<DashboardStats> {
    try {
      secureLog.info('📊 [adminService] Fetching stats...');
      const response = await api.get<ApiResponse<DashboardStats>>('/admin/stats');
      
      // الوصول للبيانات أصبح أسهل بفضل التوحيد في ملف api.ts
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error(MESSAGES.ERRORS.DEFAULT);
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get stats error', error);
      // استخدام الرسالة القادمة من السيرفر أو الرسالة الموحدة
      throw error.userMessage || MESSAGES.ERRORS.DEFAULT;
    }
  },

  /**
   * ✅ جلب قائمة المستخدمين مع التصفية والترقيم
   */
  async getUsers(params: any = {}): Promise<{ data: User[]; pagination: any }> {
    try {
      const queryString = buildQueryString({
        page: params.page,
        limit: params.limit,
        search: params.search ? sanitizeInput(params.search) : undefined,
        role: params.role,
        isActive: params.isActive
      });

      secureLog.info('📋 [adminService] Fetching users...');
      const response = await api.get<ApiResponse<User[]>>(`/admin/users${queryString}`);
      
      if (response.data?.success) {
        return {
          data: response.data.data || [],
          pagination: response.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 }
        };
      }
      return { data: [], pagination: {} };
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get users error', error);
      return { data: [], pagination: {} };
    }
  },

  /**
   * ✅ تحديث بيانات مستخدم (الدور أو الحالة)
   */
  async updateUser(userId: string, updates: { role?: string; isActive?: boolean }): Promise<User> {
    try {
      if (!userId) throw new Error('معرف المستخدم مطلوب');
      secureLog.info(`✏️ [adminService] Updating user ${userId}...`);
      
      const response = await api.put<ApiResponse<User>>(`/admin/users/${userId}`, updates);
      
      if (response.data?.success) {
        secureLog.info('✅ User updated');
        return response.data.data;
      }
      throw new Error(MESSAGES.ERRORS.DEFAULT);
    } catch (error: any) {
      secureLog.error('❌ [adminService] Update user error', error);
      throw error.userMessage || MESSAGES.ERRORS.DEFAULT;
    }
  },

  /**
   * ✅ جلب حالة النظام (System Health)
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      secureLog.info('💻 [adminService] Fetching system health...');
      const response = await api.get<ApiResponse<SystemHealth>>('/admin/system/health');
      
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error('فشل في جلب حالة النظام');
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get system health error', error);
      throw error.userMessage || 'فشل في الاتصال بالنظام';
    }
  },

  /**
   * ✅ حذف منشور بشكل نهائي
   */
  async deletePost(postId: string): Promise<void> {
    try {
      if (!postId) throw new Error('معرف المنشور مطلوب');
      secureLog.info(`🗑️ [adminService] Deleting post ${postId}...`);
      
      const response = await api.delete<ApiResponse<null>>(`/admin/posts/${postId}`);
      
      if (!response.data?.success) {
        throw new Error('فشل حذف المنشور');
      }
      secureLog.info('✅ Post deleted');
    } catch (error: any) {
      secureLog.error('❌ [adminService] Delete post error', error);
      throw error.userMessage || MESSAGES.ERRORS.DEFAULT;
    }
  }
};

export default adminService;