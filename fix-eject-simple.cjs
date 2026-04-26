const fs = require('fs');

let content = fs.readFileSync('./server/server.js', 'utf8');

const old = `  _handleEject(player, count = 1) {
    if (player.frozen > 0) return
    const ejected = []
    let ejectsDone = 0
    for (const cell of player.cells) {
      for (let i = 0; i < count; i++) {
        if (ejectsDone >= count) break
        if (cell.mass <= EJECT_COST + 20) continue
        cell.mass -= EJECT_COST
        const dx = (player.inputX || 0) - cell.x
        const dy = (player.inputY || 0) - cell.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const baseAngle = Math.atan2(dy, dx)
        const scatter = (Math.random() - 0.5) * 0.42
        const angle = baseAngle + scatter
        const em = {
          id: rndId(),
          ownerId: player.id,
          x: cell.x + Math.cos(angle) * (massToRadius(cell.mass) + 10),
          y: cell.y + Math.sin(angle) * (massToRadius(cell.mass) + 10),
          vx: Math.cos(angle) * 16,
          vy: Math.sin(angle) * 16,
          color: player.color,
          mass: EJECT_MASS,
          age: 0
        }
        ejected.push(em)
        this.ejectedMasses.push(em)
        this._checkEjectedVirus(em)
        ejectsDone++
      }
      if (ejectsDone >= count) break
    }
    if (ejected.length) io.to(this.id).emit('ejected:spawn', ejected)
  }`;

const newCode = `  _handleEject(player, count = 1) {
    if (player.frozen > 0) return
    const ejected = []
    for (let i = 0; i < count; i++) {
      for (const cell of player.cells) {
        if (cell.mass <= EJECT_COST + 20) continue
        cell.mass -= EJECT_COST
        const dx = (player.inputX || 0) - cell.x
        const dy = (player.inputY || 0) - cell.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const baseAngle = Math.atan2(dy, dx)
        const scatter = (Math.random() - 0.5) * 0.42
        const angle = baseAngle + scatter
        const em = {
          id: rndId(),
          ownerId: player.id,
          x: cell.x + Math.cos(angle) * (massToRadius(cell.mass) + 10),
          y: cell.y + Math.sin(angle) * (massToRadius(cell.mass) + 10),
          vx: Math.cos(angle) * 16,
          vy: Math.sin(angle) * 16,
          color: player.color,
          mass: EJECT_MASS,
          age: 0
        }
        ejected.push(em)
        this.ejectedMasses.push(em)
        this._checkEjectedVirus(em)
      }
    }
    if (ejected.length) io.to(this.id).emit('ejected:spawn', ejected)
  }`;

if (content.includes(old)) {
  content = content.replace(old, newCode);
  fs.writeFileSync('./server/server.js', content);
  console.log('✓ Simplified eject loop');
} else {
  console.log('✗ Pattern not found - may be already fixed');
}
