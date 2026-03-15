// services/api.ts
// 🌐 مسؤول: تكوين API مع طبقة أمان وتجديد التوكن ودعم البيئات المتعددة
// @version 5.0.0 - Production Ready

import axios from 'axios';
import { API_CONFIG, MESSAGES } from '@/utils/constants';
import { secureLog } from '@/utils/security';

// ============================================================================
// تحديد الرابط الأساسي ديناميكياً (الدعم المحلي والإنتاج)
// ============================================================================
const getBaseURL = () => {
  // إذا كان التطبيق يعمل في بيئة الإنتاج على Vercel
  if (process.env.NODE_ENV === 'production') {
    return 'https://mansati-backend-7aiy.onrender.com/api';
  }
  // في بيئة التطوير المحلية، نستخدم المتغير من ملف .env أو اللوكال هوست كاحتياط
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

const BASE_API_URL = getBaseURL();

// ============================================================================
// واجهة الاستجابة الموحدة لجميع الخدمات
// ============================================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore?: boolean;
  };
}

// ============================================================================
// إنشاء كائن axios مع إعدادات متقدمة
// ============================================================================
const api = axios.create({
  baseURL: BASE_API_URL,
  timeout: 30000, // زيادة المهلة لـ 30 ثانية لتناسب Render المجاني
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// ============================================================================
// إدارة طوابير تجديد التوكن (Token Refresh Logic)
// ============================================================================
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ============================================================================
// Request Interceptor: تسجيل الطلبات الخارجة لأغراض المراقبة
// ============================================================================
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      secureLog.info(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    secureLog.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor: معالجة الأخطاء وتجديد الجلسة تلقائياً
// ============================================================================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. معالجة أخطاء الشبكة (سيرفر متوقف أو مشكلة اتصال)
    if (!error.response) {
      secureLog.error('🌐 Network error:', error);
      return Promise.reject({
        message: error.message,
        userMessage: MESSAGES.ERRORS.NETWORK,
        isNetworkError: true,
      });
    }

    // 2. معالجة انتهاء الجلسة (Unauthorized - 401)
    if (error.response.status === 401 && !originalRequest._retry) {
      
      // تجنب الدخول في حلقة مفرغة إذا فشل التجديد نفسه
      if (originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject({
          message: 'انتهت الجلسة بالكامل',
          userMessage: MESSAGES.ERRORS.UNAUTHORIZED,
          requiresLogin: true
        });
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        secureLog.log('🔄 محاولة تجديد الجلسة تلقائياً...');
        // نستخدم axios الخام لتجنب الـ interceptor الخاص بـ api
        await axios.post(`${BASE_API_URL}/auth/refresh`, {}, { withCredentials: true });
        
        secureLog.log('✅ تم التجديد، إعادة إرسال الطلب الأصلي...');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        return Promise.reject({
          message: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
          userMessage: MESSAGES.ERRORS.UNAUTHORIZED,
          requiresLogin: true,
        });
      } finally {
        isRefreshing = false;
      }
    }

    // 3. معالجة بقية أخطاء HTTP
    let userMessage = MESSAGES.ERRORS.DEFAULT;
    const status = error.response.status;

    switch (status) {
      case 400: userMessage = error.response.data?.message || MESSAGES.ERRORS.VALIDATION; break;
      case 403: userMessage = MESSAGES.ERRORS.FORBIDDEN; break;
      case 404: userMessage = MESSAGES.ERRORS.NOT_FOUND; break;
      case 429: userMessage = 'محاولات كثيرة جداً، يرجى الانتظار دقيقة'; break;
      case 500: userMessage = MESSAGES.ERRORS.SERVER; break;
    }

    return Promise.reject({
      status,
      data: error.response.data,
      userMessage,
    });
  }
);

export default api;