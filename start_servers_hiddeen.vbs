Set WshShell = CreateObject("WScript.Shell")

' give windows some time to start the process
WScript.Sleep 5000

' Start Backend
' WshShell.Run "cmd /c cd /d ""C:\school ERP\newzambia\backend"" && npm start",0, False
WshShell.Run "powershell -WindowStyle Hidden -Command ""cd 'C:\school_erp\newzambia\backend'; npm start""", 0, False


WScript.Sleep 3000

' Start Frontend
' WshShell.Run "cmd /c cd /d ""C:\school ERP\newzambia\frontend"" && npm run dev",0, False
WshShell.Run "powershell -WindowStyle Hidden -Command ""cd 'C:\school_erp\newzambia\frontend'; npm run dev""", 0, False


