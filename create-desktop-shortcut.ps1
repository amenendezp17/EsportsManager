$ProjectDir = $PSScriptRoot
$VbsPath    = Join-Path $ProjectDir "launch-web.vbs"
$IconPath   = Join-Path $ProjectDir "esports-admin\public\favicon.ico"
$DestPath   = Join-Path $env:USERPROFILE "Desktop\EsportsManager.lnk"

$shell    = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($DestPath)
$shortcut.TargetPath      = "wscript.exe"
$shortcut.Arguments       = "//B `"$VbsPath`""
$shortcut.IconLocation    = $IconPath
$shortcut.Description     = "Abrir EsportsManager en el navegador"
$shortcut.WorkingDirectory = $ProjectDir
$shortcut.Save()

Write-Host ""
Write-Host "  [OK] Icono 'EsportsManager' creado en el escritorio." -ForegroundColor Green
Write-Host "       Haz doble clic para abrir la aplicacion web." -ForegroundColor Gray
Write-Host ""
