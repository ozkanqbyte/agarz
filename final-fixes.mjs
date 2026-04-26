import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dir, 'server', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Fix _handleEject - count parametresi ekle
const oldHandleEject = `  _handleEject(player) {
    if (player.frozen > 0) return
    const ejected = []
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
    if (ejected.length) io.to(this.id).emit('ejected:spawn', ejected)
  }`;

const newHandleEject = `  _handleEject(player, count = 1) {
    if (player.frozen > 0) return
    const ejected = []
    for (let ejectCount = 0; ejectCount < count; ejectCount++) {
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

content = content.replace(oldHandleEject, newHandleEject);

// 2. Bot speed'ı azalt - speedForMass kullan
const oldBotSpeed = `const baseSpeed = speedForMass(cell.mass) * speedMult * slowMult * 60`;

const newBotSpeed = `const baseSpeed = speedForMass(cell.mass, false) * speedMult * slowMult * 60`;

content = content.replace(oldBotSpeed, newBotSpeed);

// 3. Enemy speed'ı azalt (0.85 multiplier)
const oldEnemyMovement = `const baseSpeed = speedForMass(sc.mass || 20) * 60 * 0.5`;

const newEnemyMovement = `const baseSpeed = speedForMass(sc.mass || 20, true) * 60 * 0.5`;

content = content.replace(oldEnemyMovement, newEnemyMovement);

fs.writeFileSync(serverPath, content, 'utf8');

console.log('✓ Final fixes:');
console.log('  - _handleEject: count parameter with nested loop');
console.log('  - Bot speed: speedForMass(mass, false) - normal');
console.log('  - Enemy speed: speedForMass(mass, true) - 0.85x');
