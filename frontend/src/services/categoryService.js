import axiosClient from '../api/axiosClient';

const categoryService = {
	getAll: async (storeId) => {
		const url = storeId ? `/categories?storeId=${storeId}` : '/categories';
		return axiosClient.get(url);
	},
	getById: async (id) => {
		return axiosClient.get(`/categories/${id}`);
	},
	create: async (data) => {
		return axiosClient.post('/categories', data);
	},
	update: async (id, data) => {
		return axiosClient.put(`/categories/${id}`, data);
	},
	delete: async (id) => {
		return axiosClient.delete(`/categories/${id}`);
	},
	search: async (keyword) => {
		return axiosClient.get('/categories/search', {
			params: { keyword },
		});
	},
};

export default categoryService;
