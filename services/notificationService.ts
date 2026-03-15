// services/notificationService.ts
// 🔔 خدمة الإشعارات - نسخة متوافقة مع نظام API v5.0
// @version 3.0.0 | Production Ready

import api, { ApiResponse } from "./api"; // ✅ استخدام النوع الموحد
import type { 
    Notification, 
    NotificationsResponse, 
    NotificationType 
} from "@/types/Notification";
import { secureLog } from "@/utils/security";

// ============================================================================
// الأنواع الخاصة بالخدمة
// ============================================================================

export interface CreateNotificationData {
    recipient: string;
    type: NotificationType;
    message: string;
    title?: string;
    conversationId?: string;
    data?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    actionUrl?: string;
}

// ============================================================================
// خدمة الإشعارات (Notification Service)
// ============================================================================

const notificationService = {
    
    /**
     * ✅ جلب قائمة الإشعارات مع الترقيم (Pagination)
     */
    async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationsResponse> {
        try {
            secureLog.info(`🔔 جلب الإشعارات - الصفحة: ${page}`);
            
            const response = await api.get<ApiResponse<NotificationsResponse['data']>>(
                `/notifications?page=${page}&limit=${limit}`
            );
            
            // في حال النجاح، نرجع البيانات والهيكل المطلوب للواجهة
            if (response.data?.success) {
                return {
                    success: true,
                    data: response.data.data,
                    pagination: response.data.pagination || { page, limit, total: 0, pages: 0, hasMore: false }
                };
            }
            
            throw new Error('فشل جلب البيانات من السيرفر');
        } catch (error: any) {
            secureLog.error('❌ فشل جلب الإشعارات', error);
            
            // إرجاع هيكل فارغ في حال الخطأ لمنع انهيار الواجهة (UI Crash)
            return {
                success: false,
                data: { notifications: [], stats: { unreadCount: 0, total: 0 } },
                pagination: { page, limit, total: 0, pages: 0, hasMore: false }
            };
        }
    },

    /**
     * ✅ جلب عدد الإشعارات غير المقروءة فقط
     * مفيدة جداً لتحديث رقم الـ Badge في القائمة العلوية
     */
    async getUnreadCount(): Promise<number> {
        try {
            const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
            return response.data?.data?.count || 0;
        } catch (error) {
            secureLog.error('❌ فشل جلب عدد الإشعارات');
            return 0;
        }
    },

    /**
     * ✅ تحديث إشعار معين كمقروء
     */
    async markAsRead(notificationId: string): Promise<Notification> {
        try {
            const response = await api.patch<ApiResponse<Notification>>(`/notifications/${notificationId}/read`);
            
            if (response.data?.success) {
                return response.data.data;
            }
            throw new Error('فشل تحديث حالة الإشعار');
        } catch (error: any) {
            secureLog.error('❌ خطأ في تحديث الإشعار', error);
            throw error.userMessage || 'لا يمكن تحديث الإشعار حالياً';
        }
    },

    /**
     * ✅ تحديث كل الإشعارات كمقروءة دفعة واحدة
     */
    async markAllAsRead(): Promise<void> {
        try {
            await api.patch('/notifications/read-all');
            secureLog.info('🔔 تم تحديد الكل كمقروء');
        } catch (error: any) {
            secureLog.error('❌ فشل تحديث الكل كمقروء');
            throw error.userMessage || 'فشلت العملية، حاول لاحقاً';
        }
    },

    /**
     * ✅ حذف إشعار نهائياً
     */
    async deleteNotification(notificationId: string): Promise<void> {
        try {
            secureLog.info(`🗑️ حذف الإشعار: ${notificationId}`);
            await api.delete(`/notifications/${notificationId}`);
        } catch (error: any) {
            secureLog.error('❌ فشل حذف الإشعار');
            throw error.userMessage || 'لا يمكن حذف الإشعار الآن';
        }
    },

    /**
     * ✅ إنشاء إشعار يدوي (إداري أو داخلي)
     */
    async createNotification(data: CreateNotificationData): Promise<Notification> {
        try {
            const response = await api.post<ApiResponse<Notification>>('/notifications', data);
            
            if (response.data?.success) {
                return response.data.data;
            }
            throw new Error('فشل إنشاء الإشعار');
        } catch (error: any) {
            secureLog.error('❌ فشل إنشاء الإشعار', error);
            throw error.userMessage || 'خطأ في إرسال الإشعار';
        }
    }
};

export default notificationService;