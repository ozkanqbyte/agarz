$file = 'c:\Users\ozkanakcayy2\Downloads\agarz\server\server.js'
$content = Get-Content $file -Raw

# Fix 1: friction 0.82 -> 0.93
$content = $content -replace 'cell\.splitVx \*= 0\.82', 'cell.splitVx *= 0.93'
$content = $content -replace 'cell\.splitVy \*= 0\.82', 'cell.splitVy *= 0.93'

# Fix 2: split speed dynamic + spawn position fix
$content = $content -replace 'splitVx: nx \* SPLIT_SPEED,\s*\n\s*splitVy: ny \* SPLIT_SPEED', "splitVx: nx * Math.max(SPLIT_SPEED * 2, Math.sqrt(cell.mass) * 1.8),`n        splitVy: ny * Math.max(SPLIT_SPEED * 2, Math.sqrt(cell.mass) * 1.8)"
$content = $content -replace "x: clamp\(cell\.x \+ nx \* \(nr \+ 5\), nr, WORLD_SIZE - nr\),\s*\n\s*y: clamp\(cell\.y \+ ny \* \(nr \+ 5\), nr, WORLD_SIZE - nr\),", "x: clamp(cell.x + nx * (nr * 2 + 6), nr, WORLD_SIZE - nr),`n        y: clamp(cell.y + ny * (nr * 2 + 6), nr, WORLD_SIZE - nr),"

# Fix 3: timer-based mouse following - replace the else if block
$oldBlock = @'
      } else if (!frozen) {
        const baseSpeed = speedForMass(cell.mass) * speedMult * 60
        const dx = (player.inputX || 0) - cell.x
        const dy = (player.inputY || 0) - cell.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d >= 1) {
          const nx = dx / d, ny = dy / d
          const move = Math.min(baseSpeed * dt, d)
          cell.x = clamp(cell.x + nx * move, r, WORLD_SIZE - r)
          cell.y = clamp(cell.y + ny * move, r, WORLD_SIZE - r)
        }
      }
'@
$newBlock = @'
      }
      if (!frozen) {
        let splitFactor = 1
        if (cell.mergeTimer !== undefined && cell.mergeTimer < MERGE_TIME) {
          splitFactor = Math.min(1, cell.mergeTimer / 3500)
        }
        if (splitFactor > 0) {
          const baseSpeed = speedForMass(cell.mass) * speedMult * 60 * splitFactor
          const dx = (player.inputX || 0) - cell.x
          const dy = (player.inputY || 0) - cell.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d >= 1) {
            const nx = dx / d, ny = dy / d
            const move = Math.min(baseSpeed * dt, d)
            cell.x = clamp(cell.x + nx * move, r, WORLD_SIZE - r)
            cell.y = clamp(cell.y + ny * move, r, WORLD_SIZE - r)
          }
        }
      }
'@
$content = $content.Replace($oldBlock, $newBlock)

Set-Content $file $content -NoNewline
Write-Output "Done"
