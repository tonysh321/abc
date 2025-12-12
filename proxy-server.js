const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

const app = express();
// 配置中间件
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 目标 API 地址和固定参数
const targetApi = 'http://shuixian.ltd/main/api/bulletin/bulletin.php';
const fixedParams = { admin: 3855584220 };

// 中转接口：处理 GET/POST 请求
app.all('/api/proxy-bulletin', async (req, res) => {
    try {
        let response;
        if (req.method === 'GET') {
            // GET 请求：合并固定参数
            response = await axios.get(targetApi, { params: fixedParams });
        } else if (req.method === 'POST') {
            // POST 请求：form 格式传递参数
            response = await axios.post(targetApi, new URLSearchParams(fixedParams));
        }
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const msg = error.message || '请求失败';
        res.status(status).json({ code: -1, msg, data: null });
    }
});

// 内嵌前端页面
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>公告查询</title>
    <style>
        button { padding: 8px 16px; margin: 5px; cursor: pointer; }
        .result { margin-top: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 4px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h3>公告查询工具</h3>
    <button onclick="fetchBulletin('GET')">GET 请求公告</button>
    <button onclick="fetchBulletin('POST')">POST 请求公告</button>
    <div class="result" id="result"></div>

    <script>
        const resultDom = document.getElementById('result');
        // 前端请求自己的中转接口
        const proxyUrl = '/api/proxy-bulletin';

        async function fetchBulletin(method) {
            try {
                resultDom.textContent = '请求中...';
                const response = await fetch(proxyUrl, {
                    method: method,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                const data = await response.json();
                // 格式化显示结果
                resultDom.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                resultDom.textContent = \`请求失败：\${error.message}\`;
            }
        }
    </script>
</body>
</html>
    `);
});

// 生成自签证书的配置（本地测试用）
// 注意：生产环境需要替换为正式 SSL 证书
const httpsOptions = {
    key: fs.existsSync('./private.key') ? fs.readFileSync('./private.key') : '',
    cert: fs.existsSync('./certificate.crt') ? fs.readFileSync('./certificate.crt') : ''
};

// 启动 HTTPS 服务
const port = 443;
if (httpsOptions.key && httpsOptions.cert) {
    https.createServer(httpsOptions, app).listen(port, () => {
        console.log(`服务运行在 https://localhost:${port}`);
        console.log('直接访问该地址即可使用！');
    });
} else {
    console.error('缺少 HTTPS 证书！请先生成自签证书');
}
