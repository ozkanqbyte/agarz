$file = 'c:\Users\ozkanakcayy2\Downloads\agarz\server\server.js'
$lines = Get-Content $file

$newLines = @()
$i = 0
while ($i -lt $lines.Count) {
    $line = $lines[$i]
    if ($line -match '        if \(cell\.mergeTimer !== undefined && cell\.mergeTimer < MERGE_TIME\) \{') {
        # Replace the splitFactor block - only apply when multiple cells exist
        $newLines += '        if (player.cells.length > 1 && cell.mergeTimer !== undefined && cell.mergeTimer < MERGE_TIME) {'
        $i++
        # next line is the splitFactor assignment, keep it
        $newLines += $lines[$i]
        $i++
    } else {
        $newLines += $line
        $i++
    }
}

Set-Content $file $newLines
Write-Output "Done. Lines: $($newLines.Count)"
