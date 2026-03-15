// types/Post.ts
// 📝 أنواع بيانات المنشورات - نسخة موحدة مع دوال تحويل آمنة
// @version 3.0.0
// @lastUpdated 2026

// ============================================================================
// أنواع البيانات الأساسية
// ============================================================================

export interface CommentUser {
  _id: string;
  name?: string;
  avatar?: string;
}

export interface Comment {
  _id?: string;
  user: CommentUser | string;
  text: string;
  createdAt: string;
}

export interface Share {
  user: { _id: string; name?: string; avatar?: string } | string;
  createdAt: string;
}

export interface Reaction {
  user: { _id: string; name?: string; avatar?: string } | string;
  type: string;
  createdAt?: string;
}

export interface Post {
  _id: string;
  title?: string;
  content?: string;
  createdAt: string;
  updatedAt?: string;
  author: { _id: string; name?: string; avatar?: string } | string;
  comments?: Comment[];
  shares?: Share[];
  media?: string[];
  userReaction?: string;
  reactions?: Reaction[];
}

// ============================================================================
// دوال تحويل آمنة
// ============================================================================

/**
 * تحويل أي كائن إلى كائن مستخدم للتعليق بشكل آمن
 */
export function toCommentUser(data: any): CommentUser {
  if (!data) return { _id: '', name: 'مستخدم' };
  if (typeof data === 'string') {
    return { _id: data, name: 'مستخدم' };
  }
  return {
    _id: data._id || '',
    name: data.name || 'مستخدم',
    avatar: data.avatar,
  };
}

/**
 * تحويل أي كائن إلى تعليق آمن
 */
export function toComment(data: any): Comment {
  if (!data) return { user: { _id: '', name: 'مستخدم' }, text: '', createdAt: new Date().toISOString() };
  return {
    _id: data._id,
    user: toCommentUser(data.user),
    text: data.text || '',
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

/**
 * تحويل أي كائن إلى مشاركة آمنة
 */
export function toShare(data: any): Share {
  return {
    user: data.user || '',
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

/**
 * تحويل أي كائن إلى تفاعل آمن
 */
export function toReaction(data: any): Reaction {
  return {
    user: data.user || '',
    type: data.type || 'like',
    createdAt: data.createdAt,
  };
}

/**
 * تحويل أي كائن إلى كاتب آمن
 */
export function toAuthor(data: any): { _id: string; name: string; avatar?: string } {
  if (!data) return { _id: '', name: 'مستخدم' };
  if (typeof data === 'string') {
    return { _id: data, name: 'مستخدم' };
  }
  return {
    _id: data._id || '',
    name: data.name || 'مستخدم',
    avatar: data.avatar,
  };
}

/**
 * تحويل أي كائن قادم من API إلى كيان Post صالح
 */
export function toPost(data: any): Post {
  return {
    _id: data._id || '',
    title: data.title,
    content: data.content,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt,
    author: toAuthor(data.author),
    comments: Array.isArray(data.comments) ? data.comments.map(toComment) : [],
    shares: Array.isArray(data.shares) ? data.shares.map(toShare) : [],
    media: Array.isArray(data.media) ? data.media : [],
    userReaction: data.userReaction,
    reactions: Array.isArray(data.reactions) ? data.reactions.map(toReaction) : [],
  };
}

/**
 * تحويل مصفوفة من البيانات إلى مصفوفة Post
 */
export function toPostArray(data: any[]): Post[] {
  if (!Array.isArray(data)) return [];
  return data.map(item => toPost(item));
}