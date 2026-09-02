Set WshShell = CreateObject("WScript.Shell")

' Start Backend
WshShell.CurrentDirectory = "D:\zambianew\Zambia_Project\backend"
WshShell.Run "cmd /c npm start", 0, False

' Start Frontend
WshShell.CurrentDirectory = "D:\zambianew\Zambia_Project\frontend"
WshShell.Run "cmd /c npm run dev", 0, False