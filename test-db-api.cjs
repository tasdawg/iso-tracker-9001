const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  if (req.url === '/api/databases' && req.method === 'GET') {
    const prismaDir = path.join(process.cwd(), 'prisma');
    if (!fs.existsSync(prismaDir)) {
      return res.writeHead(200, {'Content-Type': 'application/json'});
    }

    const files = fs.readdirSync(prismaDir)
      .filter(f => f.endsWith('.db') || f.endsWith('.sqlite'))
      .map(file => {
        const filePath = path.join(prismaDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          isCurrent: file === 'dev.db' || file === 'database.sqlite'
        };
      })
      .sort((a, b) => b.lastModified.localeCompare(a.lastModified));

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ databases: files }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3001, () => {
  console.log('Test server running on http://localhost:3001');
  console.log('Press Ctrl+C to stop');
});
