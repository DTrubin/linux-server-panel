// 运行时配置类型声明
declare global {
  interface Window {
    APP_CONFIG?: {
      API_HOST?: string
      API_PORT?: string
      API_PROTOCOL?: string
      WS_HOST?: string
      WS_PORT?: string
      WS_PROTOCOL?: string
    }
  }
}

export {};
