# stop_studio.ps1 — Arrête tous les services Studio OS
Write-Host "[STOP] Arrêt des services Studio OS..."
Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -eq "" -and $_.CommandLine -match "claude_proxy|canvas_gateway|autopilot"
} | ForEach-Object {
    Write-Host "  Arrêt PID $($_.Id)"
    $_ | Stop-Process -Force
}
# Fallback : tuer les processus Python sur nos ports connus
foreach ($port in @(7331, 8765, 8766)) {
    $conn = netstat -ano | Select-String ":$port " | Select-Object -First 1
    if ($conn) {
        $pid = ($conn -split "\s+")[-1]
        if ($pid -match "^\d+$") {
            Write-Host "  Arrêt port $port (PID $pid)"
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}
Write-Host "[DONE] Services arrêtés."
