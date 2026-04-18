$file = 'c:\Users\ozkanakcayy2\Downloads\agarz\server\server.js'
$lines = Get-Content $file

$newLines = @()
$i = 0
while ($i -lt $lines.Count) {
    $line = $lines[$i]
    
    if ($line -match '      if \(!frozen\) \{') {
        $newLines += '      if (!frozen) {'
        $i++
        # Add movement lines
        while ($i -lt $lines.Count -and $lines[$i] -notmatch '      cell\.x = clamp\(cell\.x, r') {
            $newLines += $lines[$i]
            $i++
        }
        # Add closing brace for if (!frozen)
        $newLines += '      }'
        # Add the cell.x/y clamp lines
        $newLines += '      cell.x = clamp(cell.x, r, WORLD_SIZE - r)'
        $newLines += '      cell.y = clamp(cell.y, r, WORLD_SIZE - r)'
        # Skip the old clamp lines and the closing brace of the for loop
        while ($i -lt $lines.Count -and $lines[$i] -notmatch '    \}') {
            $i++
        }
        $newLines += '    }'
        $i++ # skip the old }
    } else {
        $newLines += $line
        $i++
    }
}

Set-Content $file $newLines
Write-Output "Done. Lines: $($newLines.Count)"
