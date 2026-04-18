$file = 'c:\Users\ozkanakcayy2\Downloads\agarz\server\server.js'
$lines = Get-Content $file

$newLines = @()
$i = 0
while ($i -lt $lines.Count) {
    $line = $lines[$i]
    # Find the separation block
    if ($line -match '          if \(ad < minD\) \{') {
        $newLines += $line
        $i++
        # Replace the push calculation line
        if ($lines[$i] -match 'const push = \(minD - ad\)') {
            $newLines += '            const overlap = minD - ad'
            $newLines += '            const push = (overlap / (2 * ad)) * 1.6'
        } else {
            $newLines += $lines[$i]
        }
        $i++
    } else {
        $newLines += $line
        $i++
    }
}

Set-Content $file $newLines
Write-Output "Done. Lines: $($newLines.Count)"
