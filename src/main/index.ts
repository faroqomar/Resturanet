import { app, BrowserWindow, session } from "electron";
import { join, resolve } from "node:path";
import { DatabaseManager } from "./database";
import { seedCatalogs } from "./seed";
import { AppStore } from "./store";
import { AttachmentService } from "./files";
import { BackupService } from "./backup";
import { registerIpc } from "./ipc";

let window: BrowserWindow | null = null;
let manager: DatabaseManager;
let store: AppStore;

if (process.env.RESTURANET_DATA_DIR) {
  app.setPath("userData", resolve(process.env.RESTURANET_DATA_DIR));
}

function createWindow(): void {
  window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    title:
      store?.settings().language === "en" ? "Restaurant System" : "نظام المطعم",
    backgroundColor: "#f5f0e7",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.once("ready-to-show", () => window?.show());
  window.webContents.on("did-fail-load", (_event, code, description) => {
    console.error("Renderer load failed:", code, description);
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  if (process.env["ELECTRON_RENDERER_URL"])
    window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  else window.loadFile(join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  const dataDir = app.getPath("userData");
  manager = new DatabaseManager(join(dataDir, "resturanet.sqlite"));
  seedCatalogs(manager.db);
  store = new AppStore(manager.db);
  const files = new AttachmentService(
    () => manager.db,
    dataDir,
    () => store.settings().language,
  );
  const backup = new BackupService(
    manager,
    dataDir,
    files.attachmentsDir,
    () => {
      seedCatalogs(manager.db);
      store = new AppStore(manager.db);
    },
    () => store.settings().language,
  );
  registerIpc(() => store, files, backup);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => manager?.close());
