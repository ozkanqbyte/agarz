$file = 'c:\Users\ozkanakcayy2\Downloads\agarz\server\server.js'
$lines = Get-Content $file

# Find and replace the else if block - lines 600-611
$newLines = @()
$i = 0
while ($i -lt $lines.Count) {
    $line = $lines[$i]
    # Detect start of the else if block we want to replace
    if ($line -match '      \} else if \(!frozen\) \{') {
        # Replace with timer-based mouse following
        $newLines += '      }'
        $newLines += '      if (!frozen) {'
        $newLines += '        let splitFactor = 1'
        $newLines += '        if (cell.mergeTimer !== undefined && cell.mergeTimer < MERGE_TIME) {'
        $newLines += '          splitFactor = Math.min(1, cell.mergeTimer / 3500)'
        $newLines += '        }'
        $newLines += '        if (splitFactor > 0) {'
        $newLines += '          const baseSpeed = speedForMass(cell.mass) * speedMult * 60 * splitFactor'
        $newLines += '          const dx = (player.inputX || 0) - cell.x'
        $newLines += '          const dy = (player.inputY || 0) - cell.y'
        $newLines += '          const d = Math.sqrt(dx * dx + dy * dy)'
        $newLines += '          if (d >= 1) {'
        $newLines += '            const nx = dx / d, ny = dy / d'
        $newLines += '            const move = Math.min(baseSpeed * dt, d)'
        $newLines += '            cell.x = clamp(cell.x + nx * move, r, WORLD_SIZE - r)'
        $newLines += '            cell.y = clamp(cell.y + ny * move, r, WORLD_SIZE - r)'
        $newLines += '          }'
        $newLines += '        }'
        $newLines += '      }'
        # Skip old lines until we find the closing brace of the else block
        $i++
        while ($i -lt $lines.Count -and $lines[$i] -ne '      }') {
            $i++
        }
        $i++ # skip the closing brace
    } else {
        $newLines += $line
        $i++
    }
}

Set-Content $file $newLines
Write-Output "Done. Lines: $($newLines.Count)"
