// services/api.ts
// 🌐 مسؤول: تكوين API مع طبقة أمان وتجديد التوكن
// @version 4.3.0 - استخدام ديناميكي لرابط API من متغيرات البيئة
// @lastUpdated 2026

import axios from 'axios';
import { MESSAGES } from '@/utils/constants';
import { secureLog } from '@/utils/security';

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
// تحديد رابط API الأساسي (ديناميكي)
// ============================================================================
// في بيئة Vercel (الإنتاج)، نستخدم NEXT_PUBLIC_API_URL
// في بيئة التطوير المحلي، نستخدم fallback http://localhost:5000
const getBaseUrl = (): string => {
  // محاولة قراءة المتغير من البيئة (يتم تعيينه في Vercel)
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (envUrl) {
    // نزيل أي /api زائدة من النهاية لتوحيد المعالجة
    return envUrl.replace(/\/api\/?$/, '');
  }
  
  // القيمة الافتراضية للتطوير المحلي
  return 'http://localhost:5000';
};

const BASE_URL = getBaseUrl();

// ============================================================================
// إنشاء كائن axios
// ============================================================================

const api = axios.create({
  baseURL: `${BASE_URL}/api`,   // الآن BASE_URL ديناميكي
  timeout: 30000,                // زيادة المهلة إلى 30 ثانية (لأن خادم Render قد يكون بطيئاً في البداية)
  withCredentials: true,         // ✅ ضروري لإرسال واستقبال الكوكيز
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// ============================================================================
// إدارة طلبات التجديد المعلقة
// ============================================================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ============================================================================
// Interceptors
// ============================================================================

api.interceptors.request.use(
  (config) => {
    secureLog.info(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    secureLog.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      secureLog.error('🌐 Network error:', error);
      return Promise.reject({
        message: error.message,
        userMessage: MESSAGES.ERRORS.NETWORK,
        isNetworkError: true,
      });
    }

    if (error.response.status !== 401) {
      let userMessage = MESSAGES.ERRORS.DEFAULT;
      switch (error.response.status) {
        case 400:
          userMessage = error.response.data?.message || MESSAGES.ERRORS.VALIDATION;
          break;
        case 403:
          userMessage = MESSAGES.ERRORS.FORBIDDEN;
          break;
        case 404:
          userMessage = MESSAGES.ERRORS.NOT_FOUND;
          break;
        case 429:
          userMessage = 'محاولات كثيرة جداً. حاول بعد قليل';
          break;
        case 500:
          userMessage = MESSAGES.ERRORS.SERVER;
          break;
      }
      return Promise.reject({
        status: error.response.status,
        data: error.response.data,
        userMessage,
      });
    }

    if (originalRequest.url === '/auth/refresh') {
      return Promise.reject({
        message: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
        userMessage: MESSAGES.ERRORS.UNAUTHORIZED,
      });
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        secureLog.log('🔄 محاولة تجديد التوكن عبر /auth/refresh...');
        
        // استخدم نفس BASE_URL هنا أيضاً
        await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        secureLog.log('✅ تم تجديد التوكن بنجاح');
        processQueue(null, null);

        return api(originalRequest);
      } catch (refreshError) {
        secureLog.error('❌ فشل تجديد التوكن', refreshError);
        processQueue(refreshError, null);

        return Promise.reject({
          message: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
          userMessage: MESSAGES.ERRORS.UNAUTHORIZED,
          requiresLogin: true,
        });
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;