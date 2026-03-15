// services/followService.ts
// 👥 خدمة المتابعة - إدارة المتابعين - متوافقة مع API v5.0
// الإصدار: 3.0.0 | آخر تحديث: 2026

import api, { ApiResponse } from "./api"; // ✅ استيراد النوع الموحد
import { secureLog } from "@/utils/security";

// ============================================================================
// أنواع البيانات (Interfaces)
// ============================================================================

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface FollowUser {
  _id: string;
  name: string;
  avatar?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export interface FollowListResponse {
  data: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================================================
// خدمة المتابعة (Follow Service)
// ============================================================================

const followService = {
  
  /**
   * ✅ متابعة مستخدم
   */
  async followUser(userId: string): Promise<FollowStats> {
    try {
      secureLog.info(`👥 [FollowService] Following user: ${userId}`);
      
      const response = await api.post<ApiResponse<FollowStats>>(`/users/${userId}/follow`);
      
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'فشلت عملية المتابعة');
    } catch (error: any) {
      secureLog.error('❌ [FollowService] Follow error:', error);
      // استخدام userMessage المعالج في api.ts أو الرسالة القادمة من السيرفر
      throw error.userMessage || error.response?.data?.message || 'فشلت عملية المتابعة';
    }
  },

  /**
   * ✅ إلغاء متابعة مستخدم
   */
  async unfollowUser(userId: string): Promise<FollowStats> {
    try {
      secureLog.info(`👥 [FollowService] Unfollowing user: ${userId}`);
      
      const response = await api.delete<ApiResponse<FollowStats>>(`/users/${userId}/follow`);
      
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'فشلت عملية إلغاء المتابعة');
    } catch (error: any) {
      secureLog.error('❌ [FollowService] Unfollow error:', error);
      throw error.userMessage || error.response?.data?.message || 'فشلت عملية إلغاء المتابعة';
    }
  },

  /**
   * ✅ التحقق من حالة المتابعة لمستخدم معين
   */
  async getFollowStatus(userId: string): Promise<FollowStats> {
    try {
      const response = await api.get<ApiResponse<FollowStats>>(`/users/${userId}/follow/status`);
      
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error('فشل الحصول على الحالة');
    } catch (error: any) {
      secureLog.error('❌ [FollowService] Get follow status error:', error);
      throw error.userMessage || 'فشل في الحصول على حالة المتابعة';
    }
  },

  /**
   * ✅ جلب قائمة المتابعين (Followers)
   */
  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<FollowListResponse> {
    try {
      const response = await api.get<ApiResponse<FollowUser[]>>(
        `/users/${userId}/followers?page=${page}&limit=${limit}`
      );
      
      return {
        data: response.data?.data || [],
        pagination: response.data?.pagination || { page, limit, total: 0, pages: 0 }
      };
    } catch (error: any) {
      secureLog.error('❌ [FollowService] Get followers error:', error);
      return { data: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
  },

  /**
   * ✅ جلب قائمة من نتابعهم (Following)
   */
  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<FollowListResponse> {
    try {
      const response = await api.get<ApiResponse<FollowUser[]>>(
        `/users/${userId}/following?page=${page}&limit=${limit}`
      );
      
      return {
        data: response.data?.data || [],
        pagination: response.data?.pagination || { page, limit, total: 0, pages: 0 }
      };
    } catch (error: any) {
      secureLog.error('❌ [FollowService] Get following error:', error);
      return { data: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
  },

  /**
   * ✅ جلب حالة المتابعة لمجموعة مستخدمين (Bulk)
   * مفيدة جداً عند عرض قائمة مستخدمين لمعرفة من تتابعه منهم بطلب واحد
   */
  async getBulkFollowStatus(userIds: string[]): Promise<Record<string, boolean>> {
    try {
      const response = await api.post<ApiResponse<Record<string, boolean>>>('/users/follow/bulk-status', { userIds });
      
      return response.data?.data || {};
    } catch (error: any) {
      secureLog.error('❌ [FollowService] Bulk status error:', error);
      return {};
    }
  }
};

export default followService;