import express from 'express'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

const app = express()
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
}

const PORT = global.__config.staticPort
const logger = global.logger
const protocol = global.__config.protocol === 'https' ? https : http
const server = protocol.createServer(options, app)

// ========== 静态文件服务 ==========
app.use('/', express.static('../panel/dist'))

// ========== 404 处理 ==========
app.use('*', (req, res) => {
    // 对于SPA应用，所有未找到的路由都返回index.html
    // 让前端路由处理
    res.sendFile(path.resolve('../panel/dist/index.html'))
})

export async function startStaticServer() {
    server.listen(PORT, () => {
        logger.info(`静态文件服务已启动: ${global.__config.protocol}://127.0.0.1:${PORT}`)
    })
    server.on('error', (err) => {
        logger.error('启动静态文件服务时出错:', err)
    })
}