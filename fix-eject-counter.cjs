const fs = require('fs');

let content = fs.readFileSync('./server/server.js', 'utf8');

// Fix: ejectCount5s should increment by count, not by 1
const old = `    player._ejectCount5s++
    if (player._ejectCount5s > 600) {
      player._ejectCount5s = 0
      return
    }
    if (now - player._lastEject < 15) return
    player._lastEject = now
    const count = data?.count || 1
    room._handleEject(player, count)`;

const newCode = `    const count = data?.count || 1
    player._ejectCount5s += count
    if (player._ejectCount5s > 600) {
      player._ejectCount5s = 0
      return
    }
    if (now - player._lastEject < 15) return
    player._lastEject = now
    room._handleEject(player, count)`;

if (content.includes(old)) {
  content = content.replace(old, newCode);
  fs.writeFileSync('./server/server.js', content);
  console.log('✓ Fixed: _ejectCount5s now increments by count value');
} else {
  console.log('✗ Pattern not found');
  process.exit(1);
}
