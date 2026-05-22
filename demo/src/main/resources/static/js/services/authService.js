import { authApi } from "../api/api.js";

const AUTH_SESSION_KEY = "gm_session";

export const authService = {
    getCurrentUser: () => {
        try {
            return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
        } catch {
            return null;
        }
    },
    isLoggedIn: () => {
        return !!authService.getCurrentUser();
    },
    login: async (email, password) => {
        const result = await authApi.login({ email, password });
        const user = result?.data;
        if (result?.success && user?.id) {
            // Need to store standard user object
            const safeUser = { ...user };
            delete safeUser.password;
            
            // Add fallback avatar or orders array if missing to avoid breaking frontend assumptions
            if (!safeUser.avatar) {
                safeUser.avatar = (safeUser.name || 'U').charAt(0).toUpperCase();
            }
            if (!safeUser.orders) {
                safeUser.orders = [];
            }
            
            localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(safeUser));
            return { success: true, user: safeUser };
        }
        return { success: false, message: result?.message || "Đăng nhập thất bại" };
    },
    register: async (userForm) => {
        const result = await authApi.register(userForm);
        const user = result?.data;
        if (result?.success && user?.id) {
            const safeUser = { ...user };
            delete safeUser.password;
            if (!safeUser.avatar) safeUser.avatar = safeUser.name.charAt(0).toUpperCase();
            localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(safeUser));
            return { success: true, user: safeUser };
        }
        return { success: false, message: result?.message || "Đăng ký thất bại" };
    },
    logout: () => {
        localStorage.removeItem(AUTH_SESSION_KEY);
    }
};
