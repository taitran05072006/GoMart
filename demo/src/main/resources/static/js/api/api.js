import * as http from "./http.js";

export const authApi = {
  login: (payload) => http.post("/api/users/login", payload),
  register: (payload) => http.post("/api/users/register", payload),
};

//lay danh muc
export const categoryApi = {
  list: () => http.get("/api/categories"),
  create: (payload) => http.post("/api/categories", payload),
  listId: (id) => http.get(`/api/categories/${id}`),
  update: (id, payload) => http.put(`/api/categories/${id}`, payload),
  remove: (id) => http.del(`/api/categories/${id}`),
};
//lay san pham
export const productApi = {
  list: () => http.get("/api/products"),
  listId: (id) => http.get("/api/products/" + id),
  create: (payload) => http.post("/api/products", payload),
  category: (id) => http.get("/api/products/category/" + id),
  search: (keyword) => http.get("/api/products/search?keyword=" + keyword),
  update: (id, payload) => http.put(`/api/products/${id}`, payload),
  remove: (id) => http.del(`/api/products/${id}`),
};

//lay api order
export const orderApi = {
  list: () => http.get("/api/orders"),
  create: (payload) => http.post("/api/orders", payload),
  listId: (id) => http.get(`/api/orders/${id}`),
  updateStatus: (id, status) => http.put(`/api/orders/${id}/status?status=${status}`),
  remove: (id) => http.del(`/api/orders/${id}`),
};
//lay api cart
export const cartApi = {
  list: (userId) => http.get("/api/cart/" + userId),
  add: (userId, payload) => http.post(`/api/cart/${userId}/add`, payload),
  updateQty: (userId, productId, quantity) => http.put(`/api/cart/${userId}/update/${productId}?quantity=${quantity}`),
  remove: (userId, productId) => http.del(`/api/cart/${userId}/remove/${productId}`),
  clear: (userId) => http.del(`/api/cart/${userId}/clear`),
};

