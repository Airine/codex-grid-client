/**
 * Updater Module — Auto-update via electron-updater
 */
import { autoUpdater } from 'electron-updater';
import { dialog, BrowserWindow } from 'electron';
import { APP_NAME } from '../shared/constants';
import type { UpdateInfo } from '../shared/types';

let checkInProgress = false;

/* ───────── Configuration ───────── */

export function configureUpdater(): void {
  // Disable auto-download; we'll prompt the user
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog
      .showMessageBox(BrowserWindow.getFocusedWindow() || undefined, {
        type: 'info',
        title: 'Update Available',
        message: `A new version ${info.version} is available.`,
        detail: 'Would you like to download it now?',
        buttons: ['Download', 'Later'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox(BrowserWindow.getFocusedWindow() || undefined, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded.',
        detail: 'The application will restart to apply the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
    checkInProgress = false;
  });
}

/* ───────── Check for updates ───────── */

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  if (checkInProgress) return null;

  // Skip in development
  if (process.argv.includes('--dev')) {
    return null;
  }

  try {
    checkInProgress = true;
    const result = await autoUpdater.checkForUpdates();
    checkInProgress = false;

    if (result?.updateInfo && result.updateInfo.version !== autoUpdater.currentVersion) {
      return {
        version: result.updateInfo.version,
        releaseDate: result.updateInfo.releaseDate || new Date().toISOString(),
        releaseNotes: typeof result.updateInfo.releaseNotes === 'string'
          ? result.updateInfo.releaseNotes
          : 'New version available',
        downloadUrl: '',
      };
    }

    return null;
  } catch (err) {
    console.error('[Updater] Check failed:', (err as Error).message);
    checkInProgress = false;
    return null;
  }
}
