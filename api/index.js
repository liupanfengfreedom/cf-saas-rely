export default async function handler(req, res) {
  // 1. CORS 处理
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { url, method, headers } = req;
  const host = headers.host; 

  console.log(`[Incoming Request] Method: ${method}, Host: ${host}, Path: ${url}`);

  const WORKER_MAP = {
    'ratingpage.xsoftware.top': 'https://my-rating-worker.liupanfengfreedom.workers.dev/',
    'kv.xsoftware.top': 'https://kv-demo.liupanfengfreedom.workers.dev/',
    'chatroom.xsoftware.top': 'https://realtime-chat-demo.liupanfengfreedom.workers.dev/',
    'trans-test.xsoftware.online': 'https://kv-demo.liupanfengfreedom.workers.dev/',
  };

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  const WORKER_URL = 'https://gateway-worker.liupanfengfreedom.workers.dev/';// WORKER_MAP[host] || WORKER_MAP['ratingpage.xsoftware.top'];
  
  try {
    const targetUrl = `${WORKER_URL}${url}`;
    console.log(`[Proxying] Forwarding to: ${targetUrl}`);

    // --- 核心修复：清理 Headers ---
    const newHeaders = { ...headers };
    
    // 必须删除这些字段，让 fetch 自动生成新的
    //delete newHeaders.host; 
    delete newHeaders['content-length']; // 极其重要：防止长度不匹配
    delete newHeaders['connection'];     // 防止连接管理冲突
    delete newHeaders['x-forwarded-host'];
    delete newHeaders['x-forwarded-for'];
    delete newHeaders['x-vcl-host']; // 建议删除 Vercel 自带的特殊头

    // 处理 Body
    let requestBody = undefined;
    if (!['GET', 'HEAD'].includes(method)) {
      // Vercel 自动解析 req.body，我们需要把它转回字符串发送
      requestBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, {
      method: method,
      headers: newHeaders,
      body: requestBody,
      redirect: 'follow'
    });

    console.log(`[Response] Worker responded with status: ${response.status}`);

    const data = await response.arrayBuffer();
    
    // 转发目标响应头（排除一些逐段传输头）
    response.headers.forEach((value, key) => {
      const forbiddenHeaders = ['content-encoding', 'content-length', 'transfer-encoding', 'connection'];
      if (!forbiddenHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.status(response.status).send(Buffer.from(data));
  } catch (error) {
    console.error('[Relay Error] Stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).send('Relay Error: ' + error.message);
    }
  }
}