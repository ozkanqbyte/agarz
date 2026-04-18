$file = 'c:\Users\ozkanakcayy2\Downloads\agarz\server\server.js'
$content = Get-Content $file -Raw

# Fix split speed: too high -> more moderate (agar.io style ~30-50 units)
$content = $content -replace 'splitVx: nx \* Math\.max\(SPLIT_SPEED \* 2, Math\.sqrt\(cell\.mass\) \* 1\.8\),', 'splitVx: nx * Math.min(55, Math.max(30, Math.sqrt(cell.mass) * 0.9)),'
$content = $content -replace 'splitVy: ny \* Math\.max\(SPLIT_SPEED \* 2, Math\.sqrt\(cell\.mass\) \* 1\.8\)', 'splitVy: ny * Math.min(55, Math.max(30, Math.sqrt(cell.mass) * 0.9))'

# Fix friction: 0.93 is too slow dampening -> 0.88 (stops in ~2s, agar.io style)
$content = $content -replace 'cell\.splitVx \*= 0\.93', 'cell.splitVx *= 0.88'
$content = $content -replace 'cell\.splitVy \*= 0\.93', 'cell.splitVy *= 0.88'

# Fix separation push: 1.6 is too strong -> back to 1.0
$content = $content -replace 'const push = \(overlap / \(2 \* ad\)\) \* 1\.6', 'const push = (overlap / (2 * ad)) * 1.0'

Set-Content $file $content -NoNewline
Write-Output "Done"
