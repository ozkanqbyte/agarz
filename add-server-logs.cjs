const fs = require('fs');

let content = fs.readFileSync('./server/server.js', 'utf8');

const old = `  socket.on('input:eject', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    const now = Date.now()
    if (!player._lastEject) player._lastEject = 0
    if (!player._ejectCount5s) player._ejectCount5s = 0
    if (!player._ejectWindow) player._ejectWindow = now
    if (now - player._ejectWindow > 5000) { player._ejectCount5s = 0; player._ejectWindow = now }
    const count = data?.count || 1
    player._ejectCount5s += count
    if (player._ejectCount5s > 600) {
      player._ejectCount5s = 0
      return
    }
    if (now - player._lastEject < 15) return
    player._lastEject = now
    room._handleEject(player, count)
  })`;

const newCode = `  socket.on('input:eject', (data) => {
    console.log('[SERVER-EJECT] Received:', { data })
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    const now = Date.now()
    if (!player._lastEject) player._lastEject = 0
    if (!player._ejectCount5s) player._ejectCount5s = 0
    if (!player._ejectWindow) player._ejectWindow = now
    if (now - player._ejectWindow > 5000) { player._ejectCount5s = 0; player._ejectWindow = now }
    const count = data?.count || 1
    console.log('[SERVER-EJECT] Count:', count)
    player._ejectCount5s += count
    if (player._ejectCount5s > 600) {
      player._ejectCount5s = 0
      return
    }
    if (now - player._lastEject < 15) return
    player._lastEject = now
    console.log('[SERVER-EJECT] Calling _handleEject with:', { count })
    room._handleEject(player, count)
  })`;

if (content.includes(old)) {
  content = content.replace(old, newCode);
  fs.writeFileSync('./server/server.js', content);
  console.log('✓ Server logs added');
} else {
  console.log('✗ Pattern not found');
  process.exit(1);
}
