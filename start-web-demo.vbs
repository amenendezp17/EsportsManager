' Arranca Docker Compose en segundo plano sin mostrar ventana de comandos.
' Este archivo se copia a la carpeta de Inicio de Windows para auto-arrancar la web.
Dim fso, shell, projectDir
Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Esperar 15 segundos para que Docker Desktop arranque antes que este script
WScript.Sleep 15000

shell.Run "cmd /c cd /d """ & projectDir & """ && docker compose up -d", 0, False

Set shell = Nothing
Set fso   = Nothing
