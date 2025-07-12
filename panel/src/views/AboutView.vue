<script setup lang="ts">
import { ref, markRaw } from 'vue'
import { APP_TITLE, APP_VERSION } from '@/config/constants'
import { Monitor, Cpu, Folder, Connection } from '@element-plus/icons-vue'

// 项目信息
const projectInfo = ref({
  title: APP_TITLE,
  version: APP_VERSION,
  description: 'Linux 服务器管理面板 - 基于Vue3+TypeScript+Node.js的现代化服务器监控与管理平台',
  author: 'Trubin',
  license: 'MIT',
  repository: 'https://github.com/server-panel-team/linux-server-panel',
  buildDate: '2025年7月',
  environment: 'Production Ready'
})

// 技术栈
const techStack = ref([
  {
    category: '前端技术栈',
    icon: 'el-icon-monitor',
    technologies: [
      { name: 'Vue 3', version: '3.5.17', description: '组合式API，响应式框架' },
      { name: 'TypeScript', version: '5.8.0', description: '类型安全的JavaScript超集' },
      { name: 'Element Plus', version: '2.10.2', description: '基于Vue3的组件库' },
      { name: 'Vite', version: '7.0.0', description: '极速的前端构建工具' },
      { name: 'Pinia', version: '3.0.3', description: '新一代Vue状态管理' },
      { name: 'Vue Router', version: '4.5.1', description: 'Vue官方路由管理器' },
      { name: 'ECharts', version: '5.6.0', description: '强大的数据可视化库' },
      { name: 'Xterm.js', version: '5.5.0', description: '功能完整的Web终端' },
      { name: 'Axios', version: '1.10.0', description: 'HTTP客户端请求库' },
      { name: 'SCSS', version: '1.89.2', description: 'CSS预处理器' }
    ]
  },
  {
    category: '后端技术栈',
    icon: 'el-icon-cpu',
    technologies: [
      { name: 'Node.js', version: '18+', description: '高性能JavaScript运行时' },
      { name: 'Express', version: '4.18.2', description: '快速Web应用框架' },
      { name: 'WebSocket', version: '8.14.2', description: '实时双向通信协议' },
      { name: 'bcryptjs', version: '2.4.3', description: '安全密码哈希算法' },
      { name: 'jsonwebtoken', version: '9.0.2', description: 'JWT身份认证' },
      { name: 'multer', version: '1.4.5', description: '文件上传中间件' },
      { name: 'archiver', version: '7.0.1', description: '文件压缩处理库' },
      { name: 'chokidar', version: '4.0.3', description: '高效文件监控库' },
      { name: 'systeminformation', version: '5.21.22', description: '系统信息获取库' },
      { name: 'log4js', version: '6.9.1', description: '日志记录框架' }
    ]
  }
])

// 功能特性
const features = ref([
  {
    icon: markRaw(Monitor),
    title: '实时系统监控',
    description: '基于WebSocket的实时系统资源监控，包含CPU、内存、磁盘、网络等指标，支持图表展示和历史数据分析'
  },
  {
    icon: markRaw(Folder),
    title: '文件管理系统',
    description: '完整的文件系统操作，支持文件浏览、上传下载、在线编辑和批量操作'
  },
  {
    icon: markRaw(Connection),
    title: 'Web终端',
    description: '基于WebSocket的全功能Shell终端，支持PowerShell/Bash、实时命令执行和命令历史'
  },
  {
    icon: markRaw(Cpu),
    title: 'Cron任务调度',
    description: '完整的定时任务管理系统，支持任务创建、编辑、执行监控、日志查看和批量管理功能'
  }
])

// 项目统计
const projectStats = ref([
  { label: '总代码行数', value: '23.6K+', icon: 'el-icon-document', color: '#409EFF' },
  { label: 'Vue组件', value: '39', icon: 'el-icon-files', color: '#67C23A' },
  { label: 'API接口', value: '70+', icon: 'el-icon-link', color: '#E6A23C' },
  { label: '路由页面', value: '12', icon: 'el-icon-guide', color: '#F56C6C' },
  { label: '功能模块', value: '5', icon: 'el-icon-menu', color: '#909399' },
  { label: '开发周期', value: '半个月', icon: 'el-icon-time', color: '#606266' }
])

const currentYear = new Date().getFullYear()

// 核心功能模块
const coreModules = ref([
  {
    name: '首页',
    path: '/panel/home',
    description: '项目导航和快速访问入口',
    features: ['系统资源概览', '系统性能监控', '系统信息', '系统提醒']
  },
  {
    name: '仪表盘',
    path: '/panel/dashboard',
    description: '实时系统监控和资源状态展示',
    features: ['CPU监控', '内存状态', '磁盘使用', '网络流量', '实时图表']
  },
  {
    name: '文件管理器',
    path: '/panel/files',
    description: '完整的文件系统管理界面',
    features: ['文件浏览', '多文件操作', '在线编辑', '文件上传下载', '文件创建删除']
  },
  {
    name: 'Web终端',
    path: '/panel/terminal',
    description: '基于WebSocket的Shell终端',
    features: ['实时命令执行', 'PowerShell / Bash', '会话管理', '命令历史', '进程控制']
  },
  {
    name: '任务调度',
    path: '/panel/tasks',
    description: 'Cron定时任务管理系统',
    features: ['任务创建', 'Cron表达式', '执行监控', '日志查看', '批量操作', '状态统计']
  },
  {
    name: '日志管理',
    path: '/panel/logs',
    description: '系统和应用日志统一管理',
    features: ['大日志查看', '关键字搜索', '日志查看历史', '分块加载']
  }
])

// 技术架构
const architecture = ref([
  {
    layer: '前端展示层',
    technologies: 'Vue 3 + TypeScript + Element Plus',
    description: '响应式用户界面，组件化开发'
  },
  {
    layer: '状态管理层',
    technologies: 'Pinia + Vue Router',
    description: '集中式状态管理和路由控制'
  },
  {
    layer: '通信层',
    technologies: 'Axios + WebSocket',
    description: 'RESTful API和实时数据通信'
  },
  {
    layer: '后端服务层',
    technologies: 'Node.js + Express',
    description: 'RESTful API服务和业务逻辑处理'
  },
  {
    layer: '系统接口层',
    technologies: 'Shell + System APIs',
    description: '直接调用系统命令和API'
  },
  {
    layer: '数据存储层',
    technologies: 'JSON Files + Logs',
    description: '轻量级数据存储和日志记录'
  }
])
</script>

<template>
  <div class="about-container">
    <!-- 项目信息卡片 -->
    <el-card class="project-info-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="project-title">{{ projectInfo.title }}</span>
          <el-tag type="success" size="large">v{{ projectInfo.version }}</el-tag>
        </div>
      </template>

      <div class="project-description">
        <p>{{ projectInfo.description }}</p>

        <div class="project-meta">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="meta-item">
                <span class="meta-label">作者：</span>
                <span class="meta-value">{{ projectInfo.author }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="meta-item">
                <span class="meta-label">许可证：</span>
                <span class="meta-value">{{ projectInfo.license }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="meta-item">
                <span class="meta-label">构建时间：</span>
                <span class="meta-value">{{ projectInfo.buildDate }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-card>

    <!-- 功能特性 -->
    <el-card class="features-card" shadow="hover">
      <template #header>
        <h3>功能特性</h3>
      </template>

      <el-row :gutter="20">
        <el-col :span="6" v-for="feature in features" :key="feature.title">
          <div class="feature-item">
            <el-icon :size="40" class="feature-icon">
              <component :is="feature.icon" />
            </el-icon>
            <h4>{{ feature.title }}</h4>
            <p>{{ feature.description }}</p>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 技术栈 -->
    <el-row :gutter="20">
      <el-col :span="12" v-for="stack in techStack" :key="stack.category">
        <el-card class="tech-stack-card" shadow="hover">
          <template #header>
            <h3>{{ stack.category }}</h3>
          </template>

          <div class="tech-list">
            <div v-for="tech in stack.technologies" :key="tech.name" class="tech-item">
              <div class="tech-header">
                <span class="tech-name">{{ tech.name }}</span>
                <el-tag v-if="tech.version" type="info" size="small">
                  {{ tech.version }}
                </el-tag>
              </div>
              <p class="tech-description">{{ tech.description }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 项目统计 -->
    <el-card class="stats-card" shadow="hover">
      <template #header>
        <h3>项目统计</h3>
      </template>

      <el-row :gutter="20">
        <el-col :span="4" v-for="stat in projectStats" :key="stat.label">
          <div class="stat-item">
            <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 核心功能模块 -->
    <el-card class="modules-card" shadow="hover">
      <template #header>
        <h3>核心功能模块</h3>
      </template>

      <el-row :gutter="20">
        <el-col :span="8" v-for="module in coreModules" :key="module.name">
          <div class="module-item">
            <div class="module-header">
              <h4>{{ module.name }}</h4>
              <el-tag type="info" size="small">{{ module.path }}</el-tag>
            </div>
            <p class="module-description">{{ module.description }}</p>
            <div class="module-features">
              <el-tag v-for="feature in module.features" :key="feature" size="small" effect="plain" class="feature-tag">
                {{ feature }}
              </el-tag>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 技术架构 -->
    <el-card class="architecture-card" shadow="hover">
      <template #header>
        <h3>技术架构</h3>
      </template>

      <div class="architecture-list">
        <div v-for="(layer, index) in architecture" :key="layer.layer" class="architecture-item">
          <div class="layer-number">{{ index + 1 }}</div>
          <div class="layer-content">
            <h4>{{ layer.layer }}</h4>
            <div class="layer-tech">{{ layer.technologies }}</div>
            <p class="layer-description">{{ layer.description }}</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 页脚信息 -->
    <div class="footer-info">
      <p>&copy; {{ currentYear }} {{ projectInfo.author }}. All rights reserved.</p>
      <p>Built with {{ '❤️' }} using Vue 3 + TypeScript + Element Plus</p>
      <div class="footer-links">
        <el-link :href="projectInfo.repository" target="_blank" type="primary">
          <i class="el-icon-link"></i> GitHub Repository
        </el-link>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.about-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;

  .project-info-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .project-title {
        font-size: 24px;
        font-weight: bold;
        color: var(--el-color-primary);
      }
    }

    .project-description {
      p {
        font-size: 16px;
        line-height: 1.6;
        color: var(--el-text-color-regular);
        margin-bottom: 20px;
      }

      .project-meta {
        .meta-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;

          .meta-label {
            font-weight: bold;
            color: var(--el-text-color-primary);
            margin-right: 8px;
          }

          .meta-value {
            color: var(--el-text-color-regular);
          }
        }
      }
    }
  }

  .features-card {
    margin-bottom: 20px;

    .feature-item {
      text-align: center;
      padding: 20px;

      .feature-icon {
        color: var(--el-color-primary);
        margin-bottom: 15px;
      }

      h4 {
        margin: 10px 0;
        color: var(--el-text-color-primary);
      }

      p {
        color: var(--el-text-color-regular);
        font-size: 14px;
        line-height: 1.5;
      }
    }
  }

  .tech-stack-card {
    margin-bottom: 20px;

    .tech-list {
      overflow-y: auto;

      .tech-item {
        padding: 12px 0;
        border-bottom: 1px solid var(--el-border-color-lighter);

        &:last-child {
          border-bottom: none;
        }

        .tech-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .tech-name {
            font-weight: bold;
            color: var(--el-text-color-primary);
          }
        }

        .tech-description {
          color: var(--el-text-color-regular);
          font-size: 13px;
          margin: 0;
          line-height: 1.4;
        }
      }
    }
  }

  .stats-card {
    margin-bottom: 20px;

    .stat-item {
      text-align: center;
      padding: 20px 10px;

      .stat-value {
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 8px;
        transition: all 0.3s ease;
      }

      .stat-label {
        color: var(--el-text-color-regular);
        font-size: 14px;
      }
    }
  }

  .modules-card {
    margin-bottom: 20px;

    .module-item {
      padding: 20px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 8px;
      margin-bottom: 20px;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--el-color-primary);
        box-shadow: 0 2px 12px 0 rgba(64, 158, 255, 0.1);
      }

      .module-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h4 {
          margin: 0;
          color: var(--el-text-color-primary);
          font-size: 16px;
        }
      }

      .module-description {
        color: var(--el-text-color-regular);
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 15px;
      }

      .module-features {
        .feature-tag {
          margin-right: 8px;
          margin-bottom: 6px;
        }
      }
    }
  }

  .architecture-card {
    margin-bottom: 20px;

    .architecture-list {
      .architecture-item {
        display: flex;
        align-items: flex-start;
        padding: 20px 0;
        border-bottom: 1px solid var(--el-border-color-lighter);

        &:last-child {
          border-bottom: none;
        }

        .layer-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--el-color-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-right: 20px;
          flex-shrink: 0;
        }

        .layer-content {
          flex: 1;

          h4 {
            margin: 0 0 8px 0;
            color: var(--el-text-color-primary);
            font-size: 16px;
          }

          .layer-tech {
            color: var(--el-color-primary);
            font-weight: 500;
            margin-bottom: 8px;
            font-size: 14px;
          }

          .layer-description {
            color: var(--el-text-color-regular);
            font-size: 13px;
            line-height: 1.5;
            margin: 0;
          }
        }
      }
    }
  }

  .footer-info {
    text-align: center;
    padding: 30px 0;
    color: var(--el-text-color-secondary);
    border-top: 1px solid var(--el-border-color-light);

    p {
      margin: 5px 0;
      font-size: 14px;

      &:last-of-type {
        color: var(--el-color-primary);
        margin-bottom: 15px;
      }
    }

    .footer-links {
      margin-top: 15px;

      .el-link {
        margin: 0 10px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .about-container {
    .modules-card {
      .el-col {
        margin-bottom: 20px;
      }
    }
  }
}

@media (max-width: 768px) {
  .about-container {
    padding: 10px;

    .features-card .feature-item {
      margin-bottom: 20px;
    }

    .tech-stack-card {
      height: auto;

      .tech-list {
        max-height: none;
      }
    }

    .stats-card .stat-item {
      margin-bottom: 20px;
    }

    .modules-card .module-item {
      margin-bottom: 15px;
    }

    .architecture-card .architecture-item {
      flex-direction: column;
      text-align: center;

      .layer-number {
        margin: 0 auto 15px auto;
      }
    }
  }
}
</style>
