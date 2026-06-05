import axiosClient from '../api/axiosClient';

const geoService = {
  detect: async (address) => {
    return axiosClient.get('/geo/detect', { params: { address } });
  },
};

export default geoService;
