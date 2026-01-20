export default async function handler(req, res) {
  // 1. 你的 Worker 地址 (替换为你自己的)
  const WORKER_URL = 'my-rating-worker.liupanfengfreedom.workers.dev';

  // 2. 获取原始请求的路径和查询参数
  const { url, method, headers } = req;
  const targetPath = url.includes('?') ? url : url; 

  try {
    // 3. 构造转发请求
    const response = await fetch(`${WORKER_URL}${targetPath}`, {
      method: method,
      headers: {
        ...headers,
        // 建议保留原始 Host，以便 Worker 识别客户域名
        'x-forwarded-host': headers.host, 
      },
      // GET/HEAD 请求不能包含 body
      body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(req.body),
    });

    // 4. 获取 Worker 返回的内容
    const data = await response.arrayBuffer();
    
    // 5. 将 Worker 的 Header 透传回浏览器
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    res.status(response.status).send(Buffer.from(data));
  } catch (error) {
    res.status(500).send('Relay Error: ' + error.message);
  }
}