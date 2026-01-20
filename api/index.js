export default async function handler(req, res) {
  // 1. 务必带上 https://
  const WORKER_URL = 'https://my-rating-worker.liupanfengfreedom.workers.dev';

  const { url, method, headers } = req;

  try {
    // 2. 构造完整的转发目标
    const targetUrl = `${WORKER_URL}${url}`;

    const response = await fetch(targetUrl, {
      method: method,
      headers: {
        ...headers,
        // 传递原始 Host，方便 Worker 识别
        'x-forwarded-host': headers.host,
      },
      body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(req.body),
    });

    const data = await response.arrayBuffer();
    
    // 3. 透传响应头
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    res.status(response.status).send(Buffer.from(data));
  } catch (error) {
    console.error('Relay Error:', error);
    res.status(500).send('Relay Error: ' + error.message);
  }
}