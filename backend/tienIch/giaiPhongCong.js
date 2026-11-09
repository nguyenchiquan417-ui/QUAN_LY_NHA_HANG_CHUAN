const { execSync } = require('child_process');

try {
    if (process.platform === 'win32') {
        // Trên Windows: Dùng PowerShell hoặc netstat/taskkill để giải phóng cổng 3001 nếu đang bị chiếm
        execSync('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore' });
    } else {
        // Trên macOS/Linux: Dùng lsof
        execSync('lsof -ti :3001 | xargs kill -9 2>/dev/null || true', { stdio: 'ignore' });
    }
} catch (e) {
    // Không chặn tiến trình nếu cổng chưa có ai dùng
}
