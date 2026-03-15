// services/socketService.ts
// 🔌 مسؤول: إدارة اتصال Socket.IO مع دعم كامل للإشعارات والرسائل
// @version 5.0.0 | Production Ready

import { io, Socket } from "socket.io-client";
import { useState, useEffect, useCallback } from "react";

// ============================================================================
// الأنواع (Types)
// ============================================================================

interface OnlineUser {
    id: string;
    name: string;
    lastSeen?: Date;
}

interface SocketConfig {
    maxReconnectAttempts: number;
    reconnectDelay: number;
    connectionCheckInterval: number;
}

const SOCKET_CONFIG: SocketConfig = {
    maxReconnectAttempts: 5,
    reconnectDelay: 2000,
    connectionCheckInterval: 30000,
};

// ============================================================================
// خدمة الـ Socket (Class)
// ============================================================================

class SocketService {
    public socket: Socket | null = null;
    private static instance: SocketService;
    private listeners: Map<string, Set<Function>> = new Map();
    private isConnecting = false;

    private constructor() {} // منع الإنشاء الخارجي

    static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    /**
     * ✅ إنشاء الاتصال
     */
    connect(token: string) {
        if (this.socket?.connected || this.isConnecting) return;

        this.isConnecting = true;
        const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

        this.socket = io(url, {
            auth: { token },
            transports: ["websocket"], // الأداء الأفضل
            reconnectionAttempts: SOCKET_CONFIG.maxReconnectAttempts,
            reconnectionDelay: SOCKET_CONFIG.reconnectDelay,
        });

        this.socket.on("connect", () => {
            console.log("🔌 [Socket] Connected ✅ ID:", this.socket?.id);
            this.isConnecting = false;
            this.reattachListeners();
        });

        this.socket.on("connect_error", (err) => {
            console.error("❌ [Socket] Connection Error:", err.message);
            this.isConnecting = false;
        });
    }

    /**
     * ✅ تسجيل مستمع لحدث معين
     */
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        if (this.socket) {
            this.socket.on(event, callback as any);
        }

        // إرجاع دالة لإلغاء الاشتراك (Cleanup)
        return () => this.off(event, callback);
    }

    /**
     * ✅ إلغاء الاشتراك
     */
    off(event: string, callback: Function) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
        }
        this.socket?.off(event, callback as any);
    }

    private reattachListeners() {
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach((cb) => this.socket?.on(event, cb as any));
        });
    }

    emit(event: string, data: any) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn(`⚠️ [Socket] Cannot emit ${event}, socket not connected`);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
            console.log("🔌 [Socket] Disconnected manually");
        }
    }
}

export const socketService = SocketService.getInstance();

// ============================================================================
// Hook مخصص للاستخدام السهل في المكونات (React Hook)
// ============================================================================

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(socketService.socket?.connected || false);

    useEffect(() => {
        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);

        socketService.on("connect", handleConnect);
        socketService.on("disconnect", handleDisconnect);

        return () => {
            socketService.off("connect", handleConnect);
            socketService.off("disconnect", handleDisconnect);
        };
    }, []);

    // دالة إرسال آمنة ومغلفة بـ useCallback لتحسين الأداء
    const sendMessage = useCallback((receiverId: string, text: string) => {
        socketService.emit("send_message", { receiverId, text });
    }, []);

    return {
        isConnected,
        socketId: socketService.socket?.id,
        sendMessage,
        on: socketService.on.bind(socketService),
        emit: socketService.emit.bind(socketService)
    };
};