$file = 'c:\Users\ozkanakcayy2\Downloads\agarz\server\server.js'
$lines = Get-Content $file

$newLines = @()
$i = 0
while ($i -lt $lines.Count) {
    $line = $lines[$i]
    
    # Remove entire splitFactor block (lines 602-617) and replace with simple movement
    if ($line -match '        let splitFactor = 1') {
        # Skip the splitFactor logic, replace with simple full-speed movement
        $newLines += '        const baseSpeed = speedForMass(cell.mass) * speedMult * 60'
        $newLines += '        const dx = (player.inputX || 0) - cell.x'
        $newLines += '        const dy = (player.inputY || 0) - cell.y'
        $newLines += '        const d = Math.sqrt(dx * dx + dy * dy)'
        $newLines += '        if (d >= 1) {'
        $newLines += '          const nx = dx / d, ny = dy / d'
        $newLines += '          const move = Math.min(baseSpeed * dt, d)'
        $newLines += '          cell.x = clamp(cell.x + nx * move, r, WORLD_SIZE - r)'
        $newLines += '          cell.y = clamp(cell.y + ny * move, r, WORLD_SIZE - r)'
        $newLines += '        }'
        # Skip old lines until we reach the closing brace of splitFactor > 0 block
        $i++
        $depth = 0
        while ($i -lt $lines.Count) {
            $l = $lines[$i]
            if ($l -match '^\s+\}$') {
                if ($depth -eq 0) { $i++; break }
                $depth--
            } elseif ($l -match '\{$') {
                $depth++
            }
            $i++
        }
        continue
    }
    
    # Fix split speed: too high -> moderate
    $line = $line -replace 'splitVx: nx \* Math\.min\(55, Math\.max\(30, Math\.sqrt\(cell\.mass\) \* 0\.9\)\),', 'splitVx: nx * Math.min(28, Math.max(16, Math.sqrt(cell.mass) * 0.4)),'
    $line = $line -replace 'splitVy: ny \* Math\.min\(55, Math\.max\(30, Math\.sqrt\(cell\.mass\) \* 0\.9\)\)', 'splitVy: ny * Math.min(28, Math.max(16, Math.sqrt(cell.mass) * 0.4))'
    
    # Fix friction: 0.88 -> 0.85 (shorter travel distance)
    if ($line -match 'cell\.splitVx \*= 0\.88') { $line = $line -replace '0\.88', '0.85' }
    if ($line -match 'cell\.splitVy \*= 0\.88') { $line = $line -replace '0\.88', '0.85' }
    
    $newLines += $line
    $i++
}

Set-Content $file $newLines
Write-Output "Done. Lines: $($newLines.Count)"
