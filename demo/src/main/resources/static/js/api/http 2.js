import { API_BASE_URL } from "./config.js";

async function request(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    const raw = await response.text();
    const data = raw ? safeJsonParse(raw) : null;

    if (!response.ok) {
        const message =
            data?.message ||
            data?.error ||
            raw ||
            `Request failed: ${response.status}`;

        throw new Error(message);
    }

    return data;
}

function safeJsonParse(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

// ===== METHODS =====
export function get(path) {
    return request(path, { method: "GET" });
}

export function post(path, body) {
    return request(path, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export function put(path, body) {
    return request(path, {
        method: "PUT",
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
}

export function del(path) {
    return request(path, { method: "DELETE" });
}