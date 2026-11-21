$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$images = Join-Path $PSScriptRoot '..\assets\images'

function New-IconPen([System.Drawing.Color]$color, [single]$width) {
  $pen = [System.Drawing.Pen]::new($color, $width)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

function Fill-RoundedRect(
  [System.Drawing.Graphics]$graphics,
  [System.Drawing.Brush]$brush,
  [single]$x,
  [single]$y,
  [single]$width,
  [single]$height,
  [single]$radius
) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  $graphics.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-FamiliaMark(
  [System.Drawing.Graphics]$graphics,
  [System.Drawing.Color]$foreground,
  [System.Drawing.Color]$accent,
  [bool]$coin,
  [bool]$monochrome
) {
  $foregroundBrush = [System.Drawing.SolidBrush]::new($foreground)
  $accentBrush = [System.Drawing.SolidBrush]::new($accent)
  $roofPen = New-IconPen $accent 42
  $wallPen = New-IconPen $foreground 24

  $roof = [System.Drawing.Point[]]@(
    [System.Drawing.Point]::new(220, 466),
    [System.Drawing.Point]::new(512, 205),
    [System.Drawing.Point]::new(804, 466)
  )
  $graphics.DrawLines($roofPen, $roof)
  $graphics.DrawLine($wallPen, 278, 455, 278, 760)
  $graphics.DrawLine($wallPen, 746, 455, 746, 760)

  Fill-RoundedRect $graphics $foregroundBrush 300 564 188 190 62
  Fill-RoundedRect $graphics $foregroundBrush 418 512 188 242 64
  Fill-RoundedRect $graphics $foregroundBrush 536 564 188 190 62
  $graphics.FillEllipse($foregroundBrush, 333, 445, 104, 104)
  $graphics.FillEllipse($foregroundBrush, 456, 372, 112, 112)
  $graphics.FillEllipse($foregroundBrush, 587, 445, 104, 104)

  if ($coin) {
    $coinPen = New-IconPen $foreground 12
    $graphics.FillEllipse($accentBrush, 684, 670, 132, 132)
    $graphics.DrawEllipse($coinPen, 684, 670, 132, 132)
    if (-not $monochrome) {
      $coinFont = [System.Drawing.Font]::new('Arial', 70, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
      $coinBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(20, 60, 52))
      $graphics.DrawString('$', $coinFont, $coinBrush, 710, 680)
      $coinBrush.Dispose()
      $coinFont.Dispose()
    }
    $coinPen.Dispose()
  }

  $roofPen.Dispose()
  $wallPen.Dispose()
  $foregroundBrush.Dispose()
  $accentBrush.Dispose()
}

function Save-FamiliaIcon(
  [System.Drawing.Color]$background,
  [System.Drawing.Color]$foreground,
  [System.Drawing.Color]$accent,
  [bool]$coin,
  [bool]$monochrome,
  [string]$fileName
) {
  $bitmap = [System.Drawing.Bitmap]::new(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear($background)
  Draw-FamiliaMark $graphics $foreground $accent $coin $monochrome
  $bitmap.Save((Join-Path $images $fileName), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

$green = [System.Drawing.Color]::FromArgb(20, 60, 52)
$cream = [System.Drawing.Color]::FromArgb(248, 245, 235)
$gold = [System.Drawing.Color]::FromArgb(242, 190, 92)
$white = [System.Drawing.Color]::FromArgb(255, 255, 255)
$transparent = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)

Save-FamiliaIcon $green $cream $gold $true $false 'icon-finance-familia.png'
Save-FamiliaIcon $transparent $cream $gold $true $false 'android-icon-foreground.png'
Save-FamiliaIcon $transparent $white $white $false $true 'android-icon-monochrome.png'
Save-FamiliaIcon $transparent $cream $gold $true $false 'splash-icon.png'