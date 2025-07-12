export interface CPUInfo {
  usage: number
  model: string
  cores: number
  threads: number
  frequency: number
  loadAverage: number[]
}

export interface NetworkInterface {
  name: string
  type: string
  status: string
  bytesIn: number
  bytesOut: number
  packetsIn: number
  packetsOut: number
  errorsIn: number
  errorsOut: number
}

export interface MemoryInfo {
  usage: number
  total: number
  used: number
  available: number
  cached: number
  free: number
  buffers: number
}

export interface FilesystemInfo {
  filesystem: string
  mount: string
  type: string
  size: number
  used: number
}

export interface DiskInfo {
  usage: number
  total: number
  used: number
  free: number
  filesystems: Array<FilesystemInfo>
}

export interface SwapInfo {
  total: number
  used: number
  free: number
  usage: number
}

export interface SystemResourceData {
  cpu: CPUInfo,
  memory: MemoryInfo,
  disk: DiskInfo,
  network: {
    interfaces: Array<NetworkInterface>
  }
  swap: SwapInfo,
  timestamp: string
  hostname: string
  os: string
  kernel: string
  uptime: number
}


export interface ResourceHistory {
  cpu: Array<{ time: string; value: number }>
  memory: Array<{ time: string; value: number }>
  disk: Array<{ time: string; value: number }>
  network: {
    rx: Array<{ time: string; value: number }>
    tx: Array<{ time: string; value: number }>
  }
}
