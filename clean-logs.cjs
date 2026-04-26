const fs = require('fs');

// Remove console logs from GameEngine.js
let gameEngine = fs.readFileSync('./src/game/GameEngine.js', 'utf8');
gameEngine = gameEngine.replace(/console\.log\(\[EJECT-[WER]\][^;]*\);?\s*/g, '');
gameEngine = gameEngine.replace(/console\.log\(\[SocketClient[^\]]*\]\)[^;]*;?\s*/g, '');
fs.writeFileSync('./src/game/GameEngine.js', gameEngine);
console.log('✓ Removed GameEngine logs');

// Remove console logs from SocketClient.js
let socketClient = fs.readFileSync('./src/game/SocketClient.js', 'utf8');
socketClient = socketClient.replace(/console\.log\([^)]*\);?\s*/g, '');
fs.writeFileSync('./src/game/SocketClient.js', socketClient);
console.log('✓ Removed SocketClient logs');

// Remove console logs from server.js
let server = fs.readFileSync('./server/server.js', 'utf8');
server = server.replace(/console\.log\(\[SERVER[^\]]*\]\)[^;]*;?\s*/g, '');
fs.writeFileSync('./server/server.js', server);
console.log('✓ Removed server logs');
