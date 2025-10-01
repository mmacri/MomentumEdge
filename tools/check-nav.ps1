# Check which HTML files have a nav marker and include the nav-loader script
$files = Get-ChildItem -Path (Resolve-Path ..\) -Recurse -Include *.html -File
$report = @()
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $hasMarker = if ($content -match '(?i)nav will be injected here') { $true } else { $false }
    $hasScript = if ($content -match 'includes/nav-loader.js') { $true } else { $false }
    $report += [PSCustomObject]@{ File = $f.FullName; HasMarker = $hasMarker; HasScript = $hasScript }
}
$report | Sort-Object File | Format-Table -AutoSize

# Also print a summary of files missing script or marker
Write-Output "\nFiles missing nav marker:" 
$report | Where-Object { -not $_.HasMarker } | ForEach-Object { Write-Output $_.File }
Write-Output "\nFiles missing nav-loader script:" 
$report | Where-Object { -not $_.HasScript } | ForEach-Object { Write-Output $_.File }
