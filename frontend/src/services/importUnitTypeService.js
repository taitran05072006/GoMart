import axiosClient from '../api/axiosClient';

const importUnitTypeService = {
  getAll: async () => axiosClient.get('/admin/import-unit-types'),
};

export default importUnitTypeService;
