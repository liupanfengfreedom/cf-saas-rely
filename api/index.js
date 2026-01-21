export default async function handler(req, res) {
  // 1. 定义你的域名和 Worker 的对应关系
  const WORKER_MAP = {
    'ratingpage.xsoftware.top': 'https://my-rating-worker.liupanfengfreedom.workers.dev',
    'kv.xsoftware.top': 'https://kv-demo.liupanfengfreedom.workers.dev', // 这是你新加的
  };

  const { url, method, headers } = req;
  const host = headers.host; // 获取当前访问的域名

  // 2. 根据域名选择目标 Worker
  // 如果找不到匹配的，默认去 my-rating-worker
  const WORKER_URL = WORKER_MAP[host] || WORKER_MAP['ratingpage.xsoftware.top'];

  try {
    // 2. 构造请求，只传递必要的 Header，避免冲突
    const targetUrl = `${WORKER_URL}${url}`;
    
    // 过滤掉原始请求中可能干扰 Worker 的 Host
    const newHeaders = { ...headers };
    delete newHeaders.host; 
    delete newHeaders['x-forwarded-host'];

    const response = await fetch(targetUrl, {
      method: method,
      headers: newHeaders,
      body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(req.body),
    });

    // 3. 处理响应内容
    const data = await response.arrayBuffer();
    const responseHeaders = new Headers(response.headers);

    // 【关键修复】删除可能导致 ERR_INVALID_RESPONSE 的 Header
    // Node.js fetch 会自动解压，所以必须删除这些压缩标记
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');

    // 4. 将清洗后的 Header 发送给浏览器
    responseHeaders.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(response.status).send(Buffer.from(data));
  } catch (error) {
    console.error('Relay Error:', error);
    if (!res.headersSent) {
      res.status(500).send('Relay Error: ' + error.message);
    }
  }
}