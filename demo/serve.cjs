// Optional local static preview. No packages, business API, or database.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || process.argv[2] || 4173);
// Listen on all local interfaces by default so LAN devices can open the Demo.
// Set HOST=127.0.0.1 when local-only access is desired.
const host = process.env.HOST || '0.0.0.0';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  let url;
  try { url = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { res.writeHead(400);res.end();return; }
  const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(file).pipe(res);
  });
}).listen(port,host,()=>console.log(`吃什么 Demo: http://${host}:${port}`));
