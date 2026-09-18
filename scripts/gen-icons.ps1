Add-Type -AssemblyName System.Drawing

$sizes = @(192, 512)
$iconsDir = Join-Path $PSScriptRoot "..\web\icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
}

foreach ($sz in $sizes) {
    $bmp = [System.Drawing.Bitmap]::new($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $rect = [System.Drawing.Rectangle]::new(0, 0, $sz, $sz)
    $c1 = [System.Drawing.Color]::FromArgb(0, 112, 242)
    $c2 = [System.Drawing.Color]::FromArgb(5, 48, 117)
    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $c1, $c2, [float]45.0)
    $g.FillRectangle($brush, $rect)

    # Text SAP BTP
    $fontSize = [float]($sz / 6.5)
    $font = [System.Drawing.Font]::new([string]"Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $fontSizeSub = [float]($sz / 14.0)
    $fontSub = [System.Drawing.Font]::new([string]"Arial", $fontSizeSub, [System.Drawing.FontStyle]::Bold)

    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $white = [System.Drawing.Brushes]::White
    $cyan = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(56, 189, 248))

    $g.DrawString("SAP BTP", $font, $white, [float]($sz / 2.0), [float]($sz * 0.38), $sf)
    $g.DrawString("ESTOQUE RF", $fontSub, $cyan, [float]($sz / 2.0), [float]($sz * 0.65), $sf)

    # Red Laser Line
    $penWidth = [float]($sz / 35.0)
    $redPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(239, 68, 68), $penWidth)
    $g.DrawLine($redPen, [float]($sz * 0.15), [float]($sz * 0.52), [float]($sz * 0.85), [float]($sz * 0.52))

    $outPath = Join-Path $iconsDir ("icon-" + $sz + ".png")
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outPath"
}
