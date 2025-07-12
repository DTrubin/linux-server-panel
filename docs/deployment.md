# 部署指南

本指南详细介绍 Linux Server Panel 在生产环境中的部署方案和最佳实践。

## 🎯 部署策略

### 单机部署
适用于小型服务器或测试环境：
- 单台服务器运行完整应用
- 简单的配置和维护
- 资源要求较低

### 负载均衡部署
适用于中型到大型生产环境：
- 多台应用服务器
- 负载均衡器分发请求
- 数据库集群或共享存储

### 容器化部署
适用于云原生环境：
- Docker 容器化
- Kubernetes 编排
- 弹性伸缩和高可用

## 🚀 生产环境部署

### 1. 服务器准备

#### 系统要求
```bash
# 最低配置
CPU: 2 核心
内存: 4GB RAM
存储: 20GB SSD
网络: 10Mbps

# 推荐配置
CPU: 4 核心以上
内存: 8GB RAM 以上
存储: 50GB SSD 以上
网络: 100Mbps 以上
```

#### 系统优化
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y nginx certbot curl wget git htop

# 配置时区
sudo timedatectl set-timezone Asia/Shanghai

# 优化文件描述符限制
echo "* soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | sudo tee -a /etc/security/limits.conf

# 优化内核参数
sudo sysctl -w vm.max_map_count=262144
sudo sysctl -w fs.file-max=2097152
```

### 2. 用户和权限设置

```bash
# 创建应用用户
sudo useradd -m -s /bin/bash panel
sudo usermod -aG sudo panel

# 切换到应用用户
sudo su - panel

# 创建应用目录
mkdir -p /home/panel/app
cd /home/panel/app
```

### 3. 应用部署

#### 下载和配置
```bash
# 克隆项目
git clone https://github.com/your-repo/linux-server-panel.git .

# 安装依赖
cd panel && npm install --production
cd ../server && npm install --production

# 构建前端
cd ../panel && npm run build
```

#### 配置文件
```bash
# 生产环境配置
cat > server/config.json << EOF
{
  "adminDefaultPassword": "$(openssl rand -base64 32)",
  "port": 3000,
  "wsPort": 3001,
  "staticPort": 8080,
  "protocol": "https",
  "jwt": {
    "secret": "$(openssl rand -base64 64)",
    "expiresIn": "24h"
  },
  "security": {
    "rateLimitWindowMs": 900000,
    "rateLimitMax": 100,
    "bcryptRounds": 12
  },
  "logging": {
    "level": "info",
    "maxFiles": 10,
    "maxSize": "10m"
  }
}
EOF
```

### 4. SSL 证书配置

#### Let's Encrypt 证书
```bash
# 申请证书
sudo certbot certonly --standalone -d your-domain.com

# 创建证书更新脚本
cat > /home/panel/renew-cert.sh << 'EOF'
#!/bin/bash
sudo certbot renew --quiet
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /home/panel/app/server/key.pem
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /home/panel/app/server/cert.pem
sudo chown panel:panel /home/panel/app/server/*.pem
sudo systemctl reload nginx
sudo pm2 restart server-panel
EOF

chmod +x /home/panel/renew-cert.sh

# 添加自动更新任务
(crontab -l 2>/dev/null; echo "0 3 * * * /home/panel/renew-cert.sh") | crontab -
```

### 5. 进程管理

#### PM2 配置
```bash
# 安装 PM2
npm install -g pm2

# 创建 PM2 配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'server-panel',
      script: './server/index.js',
      cwd: '/home/panel/app',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '1G',
      restart_delay: 4000
    }
  ]
}
EOF

# 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u panel --hp /home/panel
```

### 6. Nginx 反向代理

#### 基础配置
```nginx
# /etc/nginx/sites-available/server-panel
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # 现代 SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # 静态文件
    location / {
        root /home/panel/app/panel/dist;
        try_files $uri $uri/ /index.html;
        
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket 代理
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 特殊设置
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # 文件上传大小限制
    client_max_body_size 100M;
    
    # 访问日志
    access_log /var/log/nginx/server-panel.access.log;
    error_log /var/log/nginx/server-panel.error.log;
}
```

#### 启用站点
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/server-panel /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 7. 防火墙配置

```bash
# 安装 UFW
sudo apt install ufw

# 默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许必要端口
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000  # API 端口 (内部)
sudo ufw allow 3001  # WebSocket 端口 (内部)

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status verbose
```

## 🐳 Docker 部署

### 1. Dockerfile

#### 前端 Dockerfile
```dockerfile
# panel/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 后端 Dockerfile
```dockerfile
# server/Dockerfile
FROM node:18-alpine

RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    linux-headers

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S panel -u 1001

USER panel

EXPOSE 3000 3001

CMD ["node", "index.js"]
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./panel
      dockerfile: Dockerfile
    container_name: panel-frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/ssl/certs
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: panel-backend
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./server/data:/app/data
      - ./server/logs:/app/logs
      - ./server/cert.pem:/app/cert.pem:ro
      - ./server/key.pem:/app/key.pem:ro
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 可选：监控服务
  prometheus:
    image: prom/prometheus:latest
    container_name: panel-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: panel-grafana
    ports:
      - "3030:3000"
    volumes:
      - grafana-storage:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped

volumes:
  grafana-storage:
```

### 3. 部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 开始部署 Linux Server Panel..."

# 拉取最新代码
git pull origin main

# 构建镜像
echo "📦 构建 Docker 镜像..."
docker-compose build --no-cache

# 停止旧容器
echo "🛑 停止旧服务..."
docker-compose down

# 备份数据
echo "💾 备份数据..."
mkdir -p backups
tar -czf "backups/data-$(date +%Y%m%d-%H%M%S).tar.gz" server/data/

# 启动新容器
echo "🏃 启动新服务..."
docker-compose up -d

# 健康检查
echo "🔍 检查服务状态..."
sleep 30
docker-compose ps
curl -f http://localhost:3000/health || {
    echo "❌ 健康检查失败"
    docker-compose logs backend
    exit 1
}

echo "✅ 部署完成！"
```

## ☸️ Kubernetes 部署

### 1. 配置文件

#### 命名空间
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: server-panel
```

#### ConfigMap
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: panel-config
  namespace: server-panel
data:
  config.json: |
    {
      "port": 3000,
      "wsPort": 3001,
      "protocol": "https"
    }
```

#### Secret
```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: panel-secrets
  namespace: server-panel
type: Opaque
data:
  jwt-secret: <base64-encoded-jwt-secret>
  admin-password: <base64-encoded-password>
```

#### 后端部署
```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: panel-backend
  namespace: server-panel
spec:
  replicas: 3
  selector:
    matchLabels:
      app: panel-backend
  template:
    metadata:
      labels:
        app: panel-backend
    spec:
      containers:
      - name: backend
        image: your-registry/panel-backend:latest
        ports:
        - containerPort: 3000
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: panel-secrets
              key: jwt-secret
        volumeMounts:
        - name: config
          mountPath: /app/config.json
          subPath: config.json
        - name: data
          mountPath: /app/data
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: panel-config
      - name: data
        persistentVolumeClaim:
          claimName: panel-data-pvc
```

#### 服务配置
```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: panel-backend-service
  namespace: server-panel
spec:
  selector:
    app: panel-backend
  ports:
  - name: http
    port: 3000
    targetPort: 3000
  - name: websocket
    port: 3001
    targetPort: 3001
  type: ClusterIP
```

#### Ingress
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: panel-ingress
  namespace: server-panel
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/websocket-services: "panel-backend-service"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: panel-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: panel-backend-service
            port:
              number: 3000
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: panel-backend-service
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: panel-frontend-service
            port:
              number: 80
```

### 2. 部署脚本

```bash
#!/bin/bash
# k8s-deploy.sh

# 应用所有配置
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f pvc.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml

# 等待部署完成
kubectl rollout status deployment/panel-backend -n server-panel
kubectl rollout status deployment/panel-frontend -n server-panel

# 检查状态
kubectl get pods -n server-panel
kubectl get services -n server-panel
kubectl get ingress -n server-panel
```

## 📊 监控和日志

### 1. 应用监控

#### Prometheus 配置
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'panel-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
```

#### Grafana 仪表板
```json
{
  "dashboard": {
    "title": "Server Panel Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

### 2. 日志管理

#### 日志轮转配置
```bash
# /etc/logrotate.d/server-panel
/home/panel/app/server/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 panel panel
    postrotate
        pm2 reloadLogs
    endscript
}
```

#### ELK Stack 集成
```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /home/panel/app/server/logs/*.log
  fields:
    service: server-panel
    environment: production

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  
setup.kibana:
  host: "kibana:5601"
```

## 🔧 维护脚本

### 1. 备份脚本
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/home/panel/backups"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据
tar -czf "$BACKUP_DIR/data-$DATE.tar.gz" /home/panel/app/server/data/

# 备份配置
tar -czf "$BACKUP_DIR/config-$DATE.tar.gz" /home/panel/app/server/config.json

# 清理旧备份 (保留30天)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "备份完成: $DATE"
```

### 2. 更新脚本
```bash
#!/bin/bash
# update.sh

set -e

echo "🔄 开始更新服务..."

# 备份当前版本
./backup.sh

# 拉取最新代码
git fetch origin
git checkout main
git pull origin main

# 安装依赖
cd panel && npm install --production
cd ../server && npm install --production

# 构建前端
cd ../panel && npm run build

# 重启服务
pm2 restart all

# 验证服务
sleep 10
curl -f http://localhost:3000/health

echo "✅ 更新完成！"
```

## 🔒 安全加固

### 1. 系统安全
```bash
# 禁用 root 登录
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# 更改 SSH 端口
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# 安装 fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 2. 应用安全
```javascript
// server/src/middleware/security.js
export const securityMiddleware = (req, res, next) => {
  // 移除敏感头信息
  res.removeHeader('X-Powered-By')
  
  // 添加安全头
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  next()
}
```

---

通过本部署指南，您可以根据不同的环境需求选择合适的部署方案，确保 Linux Server Panel 在生产环境中稳定、安全、高效地运行。
