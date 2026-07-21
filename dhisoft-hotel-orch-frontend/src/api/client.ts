import axios from 'axios';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL??'http://localhost:6006/api/v1'});
api.interceptors.request.use(config=>{config.headers['x-tenant-slug']=import.meta.env.VITE_TENANT_SLUG??'rainwood';const token=localStorage.getItem('hotel_os_token');if(token)config.headers.Authorization=`Bearer ${token}`;return config;});
export default api;
