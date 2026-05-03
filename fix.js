const fs=require('fs'); 
let c=fs.readFileSync('server/server.js','utf8'); 
c=c.replace(/app\.get\('\/health', \(_, res\) => res\.json\(\{ ok: true \}\)\)\n\n/,''); 
fs.writeFileSync('server/server.js',c);
