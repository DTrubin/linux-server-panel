
import express from 'express'
import fs from 'fs'
import { createServer } from 'https'

const app = express()
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
}

const PORT = global.__config.staticPort || 8080

const server = createServer(options, app)

// ========== 静态文件服务 ==========
app.use('/', express.static('../panel/dist'))

export async function startStaticServer() {
    server.listen(PORT, () => {
        logger.info(`静态文件服务已启动: https://127.0.0.1:${PORT}`)
    })
    server.on('error', (err) => {
        logger.error('启动静态文件服务时出错:', err)
    })
}