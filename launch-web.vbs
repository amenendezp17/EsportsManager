Option Explicit

Dim fso, shell, http, projectDir, ready, i
Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Levantar contenedores en segundo plano (no muestra ventana de cmd)
shell.Run "cmd /c cd /d """ & projectDir & """ && docker compose up -d", 0, True

' Esperar a que nginx responda en localhost (max 60 seg, reintentos cada 2 seg)
Set http = CreateObject("MSXML2.XMLHTTP")
ready = False
For i = 1 To 30
    WScript.Sleep 2000
    On Error Resume Next
    http.Open "GET", "http://localhost", False
    http.Send
    If Err.Number = 0 Then
        If http.Status = 200 Then
            ready = True
            Exit For
        End If
    End If
    Err.Clear
    On Error GoTo 0
Next

' Abrir navegador por defecto en localhost
shell.Run "http://localhost"

Set http  = Nothing
Set shell = Nothing
Set fso   = Nothing
