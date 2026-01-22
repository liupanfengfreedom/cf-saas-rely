export default async function handler(req, res) {
  // --- 1. 添加 CORS 响应头 ---
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { url, method, headers } = req;
  const host = headers.host; 

  // 【Log】记录请求进入
  console.log(`[Incoming Request] Method: ${method}, Host: ${host}, Path: ${url}`);

  const WORKER_MAP = {
    'ratingpage.xsoftware.top': 'https://my-rating-worker.liupanfengfreedom.workers.dev',
    'kv.xsoftware.top': 'https://kv-demo.liupanfengfreedom.workers.dev',
    'trans-test.xsoftware.online': 'https://kv-demo.liupanfengfreedom.workers.dev',
  };

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const WORKER_URL = WORKER_MAP[host] || WORKER_MAP['ratingpage.xsoftware.top'];
  
  // 【Log】记录匹配到的目标 Worker
  console.log(`[Mapping] Host "${host}" matched to Worker: ${WORKER_URL}`);

  try {
    const targetUrl = `${WORKER_URL}${url}`;
    console.log(`[Proxying] Forwarding to: ${targetUrl}`);

    const newHeaders = { ...headers };
    delete newHeaders.host; 
    delete newHeaders['x-forwarded-host'];

    // 注意：如果 req.body 已经是对象，Vercel 可能会根据 Content-Type 自动解析
    const requestBody = ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(req.body);

    const response = await fetch(targetUrl, {
      method: method,
      headers: newHeaders,
      body: requestBody,
    });

    // 【Log】记录目标响应状态
    console.log(`[Response] Worker responded with status: ${response.status}`);

    const data = await response.arrayBuffer();
    const responseHeaders = new Headers(response.headers);

    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');

    responseHeaders.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(response.status).send(Buffer.from(data));
  } catch (error) {
    // 【Log】记录错误
    console.error('[Relay Error] Stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).send('Relay Error: ' + error.message);
    }
  }
}