const fs = require('fs');

let content = fs.readFileSync('./server/server.js', 'utf8');

// 1. Fix bot speed in _updateCells (line 614)
const oldSpeed1 = `        const baseSpeed = speedForMass(cell.mass) * speedMult * slowMult * 60`;
const newSpeed1 = `        const baseSpeed = speedForMass(cell.mass, player.isBot) * speedMult * slowMult * 60`;

if (content.includes(oldSpeed1)) {
  content = content.replace(oldSpeed1, newSpeed1);
  console.log('✓ Fixed bot speed in _updateCells');
} else {
  console.log('✗ Speed pattern 1 not found');
}

// 2. Fix client-sync validation speed (line 1512)
const oldSpeed2 = `        const maxMove = speedForMass(sc.mass || 20) * 60 * 0.5`;
const newSpeed2 = `        const maxMove = speedForMass(sc.mass || 20, false) * 60 * 0.5`;

if (content.includes(oldSpeed2)) {
  content = content.replace(oldSpeed2, newSpeed2);
  console.log('✓ Fixed player speed in input sync');
} else {
  console.log('✗ Speed pattern 2 not found');
}

fs.writeFileSync('./server/server.js', content);
console.log('✓ Speed fixes applied');
