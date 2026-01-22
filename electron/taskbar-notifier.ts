import { BrowserWindow, nativeImage, app } from 'electron';
import * as path from 'path';

export class TaskbarNotifier {
  private hasError: boolean = false;

  setError(window: BrowserWindow, hasError: boolean): void {
    if (hasError && !this.hasError) {
      // 閃爍視窗
      window.flashFrame(true);

      // 設定 overlay icon (Windows only)
      // Resolve path relative to CWD (Dev) or Resources (Prod)
      // For now, assuming CWD is project root in dev
      const iconPath = path.join(process.cwd(), 'assets', 'error-badge.png');
      const badge = nativeImage.createFromPath(iconPath);

      window.setOverlayIcon(badge, 'Error occurred');
    } else if (!hasError && this.hasError) {
      window.setOverlayIcon(null, '');
      window.flashFrame(false); // Stop flashing if it's still going? Usually flashFrame(false) stops it.
    }

    // macOS Dock Badge
    if (process.platform === 'darwin') {
      app.dock.setBadge(hasError ? '!' : '');
      if (hasError) {
        app.dock.bounce('informational');
      }
    }

    this.hasError = hasError;
  }
}
