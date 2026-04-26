const fs = require('fs');

let content = fs.readFileSync('./server/server.js', 'utf8');

// Rate limit too strict - change from 15ms to 50ms for W (1 yem)
const old = `    if (now - player._lastEject < 15) return
    player._lastEject = now
    console.log('[SERVER-EJECT] Calling _handleEject with:', { count })
    room._handleEject(player, count)`;

const newCode = `    const minDelay = count === 1 ? 50 : (count === 3 ? 150 : 30)
    if (now - player._lastEject < minDelay) return
    player._lastEject = now
    console.log('[SERVER-EJECT] Calling _handleEject with:', { count })
    room._handleEject(player, count)`;

if (content.includes(old)) {
  content = content.replace(old, newCode);
  fs.writeFileSync('./server/server.js', content);
  console.log('✓ Fixed rate limits: W=50ms, E=150ms, R=30ms');
} else {
  console.log('✗ Pattern not found');
}
