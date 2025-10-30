import axios from 'axios'
import { getToken } from './auth'

const api = axios.create()

api.interceptors.request.use(config => {
  const t = getToken()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

export default api
