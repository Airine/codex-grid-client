/**
 * Tray Module — System tray icon and context menu
 */
import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import { APP_NAME } from '../shared/constants';
import type { ProxyStatus } from '../shared/types';

let tray: Tray | null = null;

/* ───────── SVG icon data (16x16 template) ───────── */

const trayIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="4" y="4" width="3.5" height="3.5" rx="0.5" fill="currentColor"/>
  <rect x="8.5" y="4" width="3.5" height="3.5" rx="0.5" fill="currentColor"/>
  <rect x="4" y="8.5" width="3.5" height="3.5" rx="0.5" fill="currentColor"/>
  <rect x="8.5" y="8.5" width="3.5" height="3.5" rx="0.5" fill="currentColor"/>
</svg>
`.trim();

function createIconFromSvg(svg: string, color: string = '#ffffff'): nativeImage {
  const svgWithColor = svg.replace(/currentColor/g, color);
  const buffer = Buffer.from(svgWithColor);
  return nativeImage.createFromBuffer(buffer, { width: 16, height: 16 });
}

/* ───────── Public API ───────── */

export function createTray(
  window: BrowserWindow,
  proxyStatus: ProxyStatus,
  onToggleProxy: () => void,
): void {
  const icon = createIconFromSvg(trayIconSvg, '#ffffff');
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip(`${APP_NAME} — ${proxyStatus.running ? 'Proxy On' : 'Proxy Off'}`);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Show ${APP_NAME}`,
      click: () => {
        window.show();
        window.focus();
      },
    },
    { type: 'separator' },
    {
      label: proxyStatus.running ? 'Stop Proxy' : 'Start Proxy',
      click: onToggleProxy,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        window.destroy();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
      window.focus();
    }
  });
}

export function updateTray(proxyStatus: ProxyStatus): void {
  if (!tray) return;

  tray.setToolTip(`${APP_NAME} — ${proxyStatus.running ? 'Proxy On' : 'Proxy Off'}`);

  // Update menu
  const window = BrowserWindow.getAllWindows()[0];
  if (!window) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Show ${APP_NAME}`,
      click: () => {
        window.show();
        window.focus();
      },
    },
    { type: 'separator' },
    {
      label: proxyStatus.running ? 'Stop Proxy' : 'Start Proxy',
      click: () => {
        // This will be handled by the main process
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        window.destroy();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
