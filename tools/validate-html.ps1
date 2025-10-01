# Lightweight HTML validator: common SEO/accessibility checks without complex regex
$root = Resolve-Path .
Write-Output "Scanning HTML files under: $root"
$files = Get-ChildItem -Path $root -Recurse -Include *.html -File
$total = $files.Count
$bad = 0

foreach ($f in $files) {
    $raw = Get-Content $f.FullName -Raw
    $l = $raw.ToLower()
    $issues = @()

    # Skip heavy document-level checks for include fragments
    $isInclude = ($f.FullName -match '[\\/]includes[\\/]')
    if (-not $isInclude) {
        # Doctype
        if ($l.IndexOf('<!doctype') -lt 0) { $issues += 'missing doctype' }

        # html lang attribute
        $htmlIdx = $l.IndexOf('<html')
        if ($htmlIdx -ge 0) {
            $end = $l.IndexOf('>', $htmlIdx)
            if ($end -gt $htmlIdx) { $htmlTag = $l.Substring($htmlIdx, $end - $htmlIdx + 1) } else { $htmlTag = $l.Substring($htmlIdx) }
            if ($htmlTag.IndexOf('lang=') -lt 0) { $issues += 'missing html lang' }
        } else {
            $issues += 'no <html> tag'
        }

        # title
        if ($l.IndexOf('<title>') -lt 0) { $issues += 'missing <title>' }

        # meta description
        if (($l.IndexOf('name="description"') -lt 0) -and ($l.IndexOf("name='description'") -lt 0) -and ($l.IndexOf('name=description') -lt 0)) { $issues += 'missing meta description' }

        # h1
        if ($l.IndexOf('<h1') -lt 0) { $issues += 'missing <h1>' }
    } else {
        # for includes/* fragments we only check for nav placeholder presence
        # and skip doctype/title/lang/h1 checks
    }

    # images alt check: scan <img ...> tags
    $pos = 0
    $foundImgAltIssue = $false
    while ($true) {
        $pos = $l.IndexOf('<img', $pos)
        if ($pos -lt 0) { break }
        $end = $l.IndexOf('>', $pos)
        if ($end -lt 0) { break }
        $tag = $l.Substring($pos, $end - $pos + 1)
        if (($tag.IndexOf(' alt=') -lt 0) -and ($tag.IndexOf('alt=') -lt 0)) { $foundImgAltIssue = $true; break }
        $pos = $end + 1
    }
    if ($foundImgAltIssue) { $issues += 'img missing alt' }

    # links target=_blank should include rel
    $pos = 0
    $foundTargetIssue = $false
    while ($true) {
        $pos = $l.IndexOf('<a', $pos)
        if ($pos -lt 0) { break }
        $end = $l.IndexOf('>', $pos)
        if ($end -lt 0) { break }
        $tag = $l.Substring($pos, $end - $pos + 1)
        if ($tag.IndexOf('_blank') -ge 0) {
            if ($tag.IndexOf('rel=') -lt 0) { $foundTargetIssue = $true; break }
        }
        $pos = $end + 1
    }
    if ($foundTargetIssue) { $issues += 'target=_blank missing rel' }

    # nav marker and loader (expect in full pages and in privacy/terms)
    if (-not $isInclude) {
        if ($l.IndexOf('nav will be injected here') -lt 0) { $issues += 'no nav marker' }
        if ($l.IndexOf('/includes/nav-loader.js') -lt 0) { $issues += 'no nav-loader script' }
    }

    # services pages: require minimal og tags
    if ($f.FullName -match '[\\/]services[\\/]') {
        if ($l.IndexOf('og:title') -lt 0) { $issues += 'missing og:title' }
        if ($l.IndexOf('og:description') -lt 0) { $issues += 'missing og:description' }
    }

    if ($issues.Count -eq 0) {
        Write-Output "OK: $($f.FullName)"
    } else {
        $bad++
        Write-Output "ISSUES: $($f.FullName) -> $($issues -join '; ')"
    }
}

Write-Output ""
Write-Output "Scanned: $total files. Files with issues: $bad"
