import axios from '@/utils/axios'
import type { LogQueryParams, LogListResponse, StreamLogParams } from '@/types/system'

/**
 * 日志管理相关API
 */

/**
 * 扩展的日志列表响应，包含后端可能返回的pagination字段
 */
export interface ExtendedLogListResponse extends LogListResponse {
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// 获取系统日志列表
export const fetchSystemLogs = async (params: StreamLogParams = {}): Promise<ExtendedLogListResponse> => {
  try {
    // 转换参数名以匹配后端API
    const apiParams = {
      page: params.page,
      pageSize: params.pageSize,
      level: params.level,
      category: params.service, // 后端使用category而不是service
      startDate: params.startTime, // 后端使用startDate而不是startTime
      endDate: params.endTime, // 后端使用endDate而不是endTime
      search: params.search,
      // 流式读取参数
      streamId: params.streamId,
      chunkSize: params.chunkSize || 5000,
      tailMode: params.tailMode || false
    }

    // 根据请求类型选择不同的endpoint
    const endpoint = params.streamId ?
      '/logs/system/stream' : // 继续流式读取
      apiParams.tailMode ?
        '/logs/system/tail' : // 读取最新日志
        '/logs/system' // 常规分页查询

    const response = await axios.get(endpoint, { params: apiParams })

    // 处理流式读取的响应格式
    if (endpoint.includes('/stream') || endpoint.includes('/tail')) {
      return {
        logs: response.data.data.logs || [],
        total: response.data.data.total || response.data.data.logs?.length || 0,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        streamId: response.data.data.streamId,
        eof: response.data.data.eof,
        isStreaming: true,
        position: response.data.data.position,
        fileSize: response.data.data.fileSize
      }
    }

    return response.data.data
  } catch (error) {
    console.error('获取系统日志失败:', error)
    throw error
  }
}

// 获取WebSocket日志列表
export const fetchWebSocketLogs = async (params: StreamLogParams = {}): Promise<ExtendedLogListResponse> => {
  try {
    // 转换参数名以匹配后端API
    const apiParams = {
      page: params.page,
      pageSize: params.pageSize,
      startDate: params.startTime, // 后端使用startDate而不是startTime
      endDate: params.endTime, // 后端使用endDate而不是endTime
      search: params.search,
      // 流式读取参数
      streamId: params.streamId,
      chunkSize: params.chunkSize || 5000,
      tailMode: params.tailMode || false
    }

    // 根据请求类型选择不同的endpoint
    const endpoint = params.streamId ?
      '/logs/websocket/stream' : // 继续流式读取
      apiParams.tailMode ?
        '/logs/websocket/tail' : // 读取最新日志
        '/logs/websocket' // 常规分页查询

    const response = await axios.get(endpoint, { params: apiParams })

    // 处理流式读取的响应格式
    if (endpoint.includes('/stream') || endpoint.includes('/tail')) {
      return {
        logs: response.data.data.logs || [],
        total: response.data.data.total || response.data.data.logs?.length || 0,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        streamId: response.data.data.streamId,
        eof: response.data.data.eof,
        isStreaming: true,
        position: response.data.data.position,
        fileSize: response.data.data.fileSize
      }
    }

    return response.data.data
  } catch (error) {
    console.error('获取WebSocket日志失败:', error)
    throw error
  }
}

// 获取审计日志列表
export const fetchAuditLogs = async (params: StreamLogParams = {}): Promise<ExtendedLogListResponse> => {
  try {
    console.log('fetchAuditLogs called with params:', params);

    // 转换参数名以匹配后端API
    const apiParams = {
      page: params.page,
      pageSize: params.pageSize,
      userId: params.service, // 审计日志使用userId
      action: Array.isArray(params.level) ? params.level.join(',') : params.level, // 审计日志使用action而不是level，后端可能期望字符串
      startDate: params.startTime, // 后端使用startDate而不是startTime
      endDate: params.endTime, // 后端使用endDate而不是endTime
      search: params.search,
      // 流式读取参数
      streamId: params.streamId,
      chunkSize: params.chunkSize || 5000,
      tailMode: params.tailMode || false
    }

    console.log('API params being sent:', apiParams);

    // 根据请求类型选择不同的endpoint
    const endpoint = params.streamId ?
      '/logs/audit/stream' : // 继续流式读取
      apiParams.tailMode ?
        '/logs/audit/tail' : // 读取最新日志
        '/logs/audit' // 常规分页查询

    console.log('Using endpoint:', endpoint);

    const response = await axios.get(endpoint, { params: apiParams })

    console.log('Raw response from API:', response);
    console.log('Response data:', response.data);
    console.log('response.data.logs exists:', !!response.data.logs);
    console.log('response.data.logs is array:', Array.isArray(response.data.logs));
    console.log('response.data.success:', response.data.success);
    console.log('response.data.data exists:', !!response.data.data);

    // 检查响应是否为空或无效
    if (!response || !response.data) {
      console.warn('Empty or invalid response from audit logs API');
      return {
        logs: [],
        total: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 10
      };
    }

    // 处理后端直接返回的格式（最新格式）
    if (response.data && typeof response.data === 'object' && 'logs' in response.data) {
      console.log('Processing direct response.data.logs format');
      return {
        logs: response.data.logs || [],
        total: response.data.total || 0,
        page: response.data.page || 1,
        pageSize: response.data.pageSize || 10,
        pagination: response.data.pagination
      };
    }

    // 处理后端返回的标准格式（带success和data包装）
    if (response.data.success && response.data.data) {
      const { logs, pagination } = response.data.data;

      // 直接返回后端数据，不进行格式转换
      return {
        logs: logs || [],
        total: pagination?.total || 0,
        page: pagination?.page || 1,
        pageSize: pagination?.pageSize || 10,
        pagination: pagination
      };
    }

    // 处理流式读取的响应格式
    if (endpoint.includes('/stream') || endpoint.includes('/tail')) {
      const logs = response.data.data?.logs?.map((log: any) => ({
        timestamp: log.created_at || log.timestamp,
        level: log.level || 'info',
        service: log.user_id || log.resource || log.service || 'audit',
        message: log.action || log.message || '审计日志',
        details: log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : undefined
      })) || [];

      return {
        logs,
        total: logs.length,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        streamId: response.data.data?.streamId,
        eof: response.data.data?.eof,
        isStreaming: true,
        position: response.data.data?.position,
        fileSize: response.data.data?.fileSize
      }
    }

    // 如果没有匹配到正确的格式，返回空结果
    console.warn('Unexpected response format from audit logs API:', response.data);
    return {
      logs: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 10
    };

  } catch (error: any) {
    console.error('获取审计日志失败:', error)
    console.error('Error details:', error.response?.data || error.message);
    throw error
  }
}

// 审计日志预加载接口 - 一次获取多页数据
export const fetchAuditLogsPreload = async (params: StreamLogParams & { preloadPages?: number } = {}): Promise<{
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  preloadedPages: number[];
  pages: Record<number, { logs: any[]; success: boolean; error?: string }>;
  pagination: any;
}> => {
  try {
    console.log('fetchAuditLogsPreload called with params:', params);

    // 转换参数名以匹配后端API
    const apiParams = {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      userId: params.service, // 审计日志使用userId
      action: Array.isArray(params.level) ? params.level.join(',') : params.level,
      startDate: params.startTime,
      endDate: params.endTime,
      search: params.search,
      preloadPages: params.preloadPages || 5
    }

    console.log('API params being sent to preload:', apiParams);

    const response = await axios.get('/logs/audit/preload', { params: apiParams })

    console.log('Raw preload response from API:', response);

    // 检查响应是否为空或无效
    if (!response || !response.data) {
      console.warn('Empty or invalid response from audit logs preload API');
      return {
        currentPage: params.page || 1,
        pageSize: params.pageSize || 10,
        total: 0,
        totalPages: 0,
        preloadedPages: [],
        pages: {},
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 10,
          total: 0,
          totalPages: 0
        }
      };
    }

    // 处理预加载响应格式
    if (response.data.success && response.data.data) {
      console.log('Processing preload response format');
      console.log('Raw response.data.data:', response.data.data);
      console.log('Response data structure check:');
      console.log('- currentPage:', response.data.data.currentPage);
      console.log('- pageSize:', response.data.data.pageSize);
      console.log('- total:', response.data.data.total);
      console.log('- preloadedPages:', response.data.data.preloadedPages);
      console.log('- pages keys:', Object.keys(response.data.data.pages || {}));
      return response.data.data;
    }

    // 如果没有匹配到正确的格式，返回空结果
    console.warn('Unexpected response format from audit logs preload API:', response.data);
    return {
      currentPage: params.page || 1,
      pageSize: params.pageSize || 10,
      total: 0,
      totalPages: 0,
      preloadedPages: [],
      pages: {},
      pagination: {
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        total: 0,
        totalPages: 0
      }
    };

  } catch (error: any) {
    console.error('获取审计日志预加载数据失败:', error)
    console.error('Error details:', error.response?.data || error.message);
    throw error
  }
}

// 获取日志统计信息
export const fetchLogStats = async (): Promise<{
  system: { total: number, recent24h: number, recentWeek: number },
  audit: { total: number, recent24h: number, recentWeek: number },
  websocket: { total: number, recent24h: number, recentWeek: number }
}> => {
  try {
    const response = await axios.get('/logs/stats')

    // 处理不同的响应格式
    if (response.data && response.data.success !== undefined) {
      // 新格式响应，带有success标志
      if (response.data.data) {
        return response.data.data;
      } else {
        // 没有数据，返回默认值
        return {
          system: { total: 0, recent24h: 0, recentWeek: 0 },
          audit: { total: 0, recent24h: 0, recentWeek: 0 },
          websocket: { total: 0, recent24h: 0, recentWeek: 0 }
        };
      }
    } else if (response.data) {
      // 直接返回响应数据
      return response.data;
    } else {
      // 没有数据，返回默认值
      return {
        system: { total: 0, recent24h: 0, recentWeek: 0 },
        audit: { total: 0, recent24h: 0, recentWeek: 0 },
        websocket: { total: 0, recent24h: 0, recentWeek: 0 }
      };
    }
  } catch (error) {
    console.error('获取日志统计信息失败:', error)
    throw error
  }
}

// 下载日志文件
export const downloadLogExport = async (type: 'system' | 'audit' | 'websocket', params: { startDate?: string, endDate?: string }): Promise<Blob> => {
  try {
    // 参数名已经匹配，不需要转换
    const response = await axios.get(`/logs/${type}/download`, {
      params,
      responseType: 'blob'
    })
    return response.data
  } catch (error) {
    console.error('下载日志文件失败:', error)
    throw error
  }
}

// 清理日志
export const purgeLogRecords = async (type: 'system' | 'audit' | 'websocket', options: {
  olderThan?: string
  levels?: string[]
}): Promise<{ deletedCount: number; freedSpace: number }> => {
  try {
    const apiParams = {
      ...options,
      // 对于审计日志，需要将levels转换为actions
      ...(type === 'audit' && options.levels ? { actions: options.levels, levels: undefined } : {})
    }

    const response = await axios.post(`/logs/${type}/clear`, apiParams)

    // 确保返回格式正确，即使后端返回不同的数据结构
    const data = response.data.data || response.data
    return {
      deletedCount: data.deletedCount || 0,
      freedSpace: data.freedSpace || 0
    }
  } catch (error) {
    console.error('清理日志失败:', error)
    throw error
  }
}

/**
 * 取消日志流式读取会话
 * @param streamId 流会话ID
 * @returns 是否成功取消
 */
export const cancelLogStream = async (streamId: string): Promise<boolean> => {
  try {
    const response = await axios.delete(`/logs/stream/${streamId}`)
    return response.data.success || false
  } catch (error) {
    console.error('取消日志流会话失败:', error)
    return false
  }
}

/**
 * 流式读取文件内容
 * @param filePath 文件路径
 * @param options 读取选项
 * @returns 文件内容流
 */
export const streamFileContent = async (filePath: string, options: {
  offset?: number
  length?: number
  encoding?: string
  chunkSize?: number
} = {}): Promise<{
  content: string
  lines?: Array<{ content: string; lineNumber?: number; type: string }>
  linesCount?: number
  offset: number
  length: number
  totalSize: number
  eof: boolean
  encoding: string
}> => {
  try {
    const response = await axios.get('/files/stream', {
      params: {
        path: filePath,
        offset: options.offset || 0,
        length: options.length || 8192,
        encoding: options.encoding || 'utf-8',
        chunkSize: options.chunkSize || 8192
      }
    })

    return response.data.data || response.data
  } catch (error) {
    console.error('流式读取文件失败:', error)
    throw error
  }
}

/**
 * 获取文件行数信息
 * @param filePath 文件路径
 * @returns 文件行数信息
 */
export const getFileLinesInfo = async (filePath: string): Promise<{
  totalLines: number
  fileSize: number
  path: string
}> => {
  try {
    const response = await axios.get('/files/lines-info', {
      params: { path: filePath }
    })

    return response.data.data || response.data
  } catch (error) {
    console.error('获取文件行数失败:', error)
    throw error
  }
}

/**
 * 获取文件基本信息
 * @param filePath 文件路径
 * @returns 文件信息
 */
export const getFileInfo = async (filePath: string): Promise<{
  name: string
  size: number
  modified: string
  mimeType: string
  encoding?: string
}> => {
  try {
    const response = await axios.get('/files/info', {
      params: { path: filePath }
    })

    return response.data.data || response.data
  } catch (error) {
    console.error('获取文件信息失败:', error)
    throw error
  }
}

/**
 * 监听文件变化（WebSocket）
 * @param filePath 文件路径
 * @param callback 变化回调
 * @returns 取消监听的函数
 */
export const watchFileChanges = (
  filePath: string,
  callback: (data: { type: 'append' | 'truncate' | 'delete', content?: string, size?: number }) => void
): (() => void) => {
  // 这里应该使用WebSocket来监听文件变化
  // 暂时返回一个空的取消函数
  return () => {}
}

/**
 * 按行获取文件内容
 * @param filePath 文件路径
 * @param startLine 起始行号（从1开始）
 * @param lineCount 行数（最大20行）
 * @param encoding 编码格式
 * @returns 指定行的内容
 */
export const getFileLines = async (filePath: string, options: {
  startLine: number
  lineCount: number
  encoding?: string
} = { startLine: 1, lineCount: 50 }): Promise<{
  lines: Array<{ lineNumber: number; content: string; type: string }>
  startLine: number
  actualLineCount: number
  requestedLineCount: number
  totalLines: number
  hasMore: boolean
}> => {
  try {
    const response = await axios.get('/files/lines', {
      params: {
        path: filePath,
        startLine: options.startLine,
        lineCount: options.lineCount,
        encoding: options.encoding || 'utf-8'
      }
    })

    return response.data.data || response.data
  } catch (error) {
    console.error('按行获取文件内容失败:', error)
    throw error
  }
}
