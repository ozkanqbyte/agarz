import fs from 'fs'; 
let c=fs.readFileSync('server/server.js','utf8'); 
const before=c.length; 
c=c.split(\"app.get^('/health', ^(_, res^) =^> res.json^({ ok: true }^)^)\n\n\").join(''); 
console.log('diff:',before-c.length); 
fs.writeFileSync('server/server.js',c);
