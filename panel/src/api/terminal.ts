import axios from '@/utils/axios'

/**
 * 获取终端会话信息
 */
export const getTerminalSessions = () => {
  return axios.get('/terminal/sessions')
}

/**
 * 获取终端统计信息
 */
export const getTerminalStats = () => {
  return axios.get('/terminal/stats')
}

export default {
  getTerminalSessions,
  getTerminalStats
}
