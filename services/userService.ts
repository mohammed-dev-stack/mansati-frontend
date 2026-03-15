// services/userService.ts
// 👤 مسؤول: إدارة الهوية والمستخدمين (Auth & User Profile)
// @version 5.0.0 | Production Ready

import api, { ApiResponse } from "./api";
import { User, SearchUserResult, toUser, toUserArray } from "@/types/User";
import { secureLog, sanitizeInput } from "@/utils/security";
import { MESSAGES } from "@/utils/constants";

// ============================================================================
// أنواع البيانات المحلية
// ============================================================================

interface LoginResponse {
  user: User;
  token?: string;
  accessToken?: string;
}

// ============================================================================
// خدمة المستخدمين (User Service)
// ============================================================================

const userService = {

  // --------------------------------------------------------------------------
  // 1. المصادقة (Authentication)
  // --------------------------------------------------------------------------

  /**
   * ✅ تسجيل الدخول
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      secureLog.info('🔐 محاولة تسجيل الدخول...');
      const response = await api.post<ApiResponse<LoginResponse>>("/auth/login", {
        email: sanitizeInput(email),
        password
      });

      const data = response.data.data;
      
      // تخزين التوكن (إذا لم يتم التعامل معه في الكوكيز من قبل السيرفر)
      const token = data.accessToken || data.token;
      if (token) {
        sessionStorage.setItem("token", token);
      }

      // تخزين بيانات المستخدم الأساسية
      localStorage.setItem("user", JSON.stringify(toUser(data.user)));
      
      return data;
    } catch (error: any) {
      secureLog.error('❌ فشل تسجيل الدخول');
      throw error.response?.data?.message || MESSAGES.ERRORS.LOGIN;
    }
  },

  /**
   * ✅ تسجيل حساب جديد
   */
  async register(userData: any): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>("/auth/register", {
        ...userData,
        email: sanitizeInput(userData.email),
        name: sanitizeInput(userData.name)
      });

      const data = response.data.data;
      localStorage.setItem("user", JSON.stringify(toUser(data.user)));
      
      return data;
    } catch (error: any) {
      secureLog.error('❌ فشل إنشاء الحساب');
      throw error.response?.data?.message || MESSAGES.ERRORS.REGISTER;
    }
  },

  /**
   * ✅ تسجيل الخروج وتطهير البيانات
   */
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      secureLog.info('🚪 تم تسجيل الخروج');
    }
  },

  // --------------------------------------------------------------------------
  // 2. جلب البيانات والبحث (Fetch & Search)
  // --------------------------------------------------------------------------

  /**
   * ✅ البحث عن مستخدمين
   */
  async searchUsers(query: string, signal?: AbortSignal): Promise<SearchUserResult[]> {
    try {
      const response = await api.get<ApiResponse<SearchUserResult[]>>(
        `/users/search?q=${encodeURIComponent(query)}`, 
        { signal }
      );
      return response.data.data || [];
    } catch (error: any) {
      if (error.name === 'CanceledError') return [];
      return [];
    }
  },

  /**
   * ✅ جلب بيانات مستخدم بالمعرف
   */
  async getById(id: string): Promise<User> {
    try {
      const response = await api.get<ApiResponse<User>>(`/users/${id}`);
      return toUser(response.data.data);
    } catch (error: any) {
      throw error.response?.data?.message || MESSAGES.ERRORS.NOT_FOUND;
    }
  },

  // --------------------------------------------------------------------------
  // 3. تحديث البيانات (Profile Management)
  // --------------------------------------------------------------------------

  /**
   * ✅ تحديث الصورة الشخصية (Avatar)
   */
  async updateAvatar(id: string, file: File): Promise<User> {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await api.put<ApiResponse<User>>(`/users/${id}/avatar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const updatedUser = toUser(response.data.data);
    
    // تحديث التخزين المحلي إذا كان هذا هو المستخدم الحالي
    if (this.getCurrentUser()?._id === id) {
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }

    return updatedUser;
  },

  /**
   * ✅ الحصول على بيانات المستخدم الحالي المخزنة محلياً
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

export default userService;