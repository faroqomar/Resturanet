import AdmZip from "adm-zip";
import { dialog } from "electron";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { CURRENT_SCHEMA_VERSION, type DatabaseManager } from "./database";
import type { AppLocale } from "../shared/contracts";

interface BackupManifest {
  app: "Resturanet";
  version: 1;
  createdAt: string;
  schemaVersion: number;
}

export class BackupService {
  constructor(
    private readonly manager: DatabaseManager,
    private readonly dataDir: string,
    private readonly attachmentsDir: string,
    private readonly onRestored: () => void,
    private readonly getLocale: () => AppLocale,
  ) {}

  async create(): Promise<{ canceled: boolean; path?: string }> {
    const english = this.getLocale() === "en";
    const stamp = new Date().toISOString().replaceAll(":", "-").slice(0, 19);
    const result = await dialog.showSaveDialog({
      title: english ? "Save backup" : "حفظ النسخة الاحتياطية",
      defaultPath: `Resturanet-backup-${stamp}.resturanet-backup`,
      filters: [
        {
          name: english ? "Resturanet backup" : "نسخة نظام المطعم",
          extensions: ["resturanet-backup"],
        },
      ],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await this.writeBackup(result.filePath);
    return { canceled: false, path: result.filePath };
  }

  private async writeBackup(destination: string): Promise<void> {
    const tempDb = join(tmpdir(), `resturanet-${randomUUID()}.sqlite`);
    try {
      await this.manager.backup(tempDb);
      const zip = new AdmZip();
      zip.addLocalFile(tempDb, "", "database.sqlite");
      const manifest: BackupManifest = {
        app: "Resturanet",
        version: 1,
        createdAt: new Date().toISOString(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
      zip.addFile(
        "manifest.json",
        Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
      );
      if (existsSync(this.attachmentsDir)) {
        for (const name of readdirSync(this.attachmentsDir)) {
          const path = join(this.attachmentsDir, name);
          if (statSync(path).isFile() && name === basename(name))
            zip.addLocalFile(path, "attachments");
        }
      }
      zip.writeZip(destination);
    } finally {
      rmSync(tempDb, { force: true });
    }
  }

  async restore(): Promise<{
    canceled: boolean;
    restored: boolean;
    message?: string;
  }> {
    const english = this.getLocale() === "en";
    const result = await dialog.showOpenDialog({
      title: english ? "Choose a backup" : "اختر نسخة احتياطية",
      properties: ["openFile"],
      filters: [
        {
          name: english ? "Resturanet backup" : "نسخة نظام المطعم",
          extensions: ["resturanet-backup"],
        },
      ],
    });
    if (result.canceled || !result.filePaths[0])
      return { canceled: true, restored: false };
    const source = result.filePaths[0];
    const zip = new AdmZip(source);
    const entries = zip.getEntries();
    const allowed = entries.every(
      (entry) =>
        entry.entryName === "manifest.json" ||
        entry.entryName === "database.sqlite" ||
        /^attachments\/[a-f0-9-]+\.(jpg|jpeg|png|pdf)$/i.test(entry.entryName),
    );
    if (!allowed) throw new Error("النسخة تحتوي مسارات أو ملفات غير متوقعة");
    const manifestEntry = zip.getEntry("manifest.json");
    const databaseEntry = zip.getEntry("database.sqlite");
    if (!manifestEntry || !databaseEntry)
      throw new Error("ملف النسخة الاحتياطية ناقص");
    const manifest = JSON.parse(
      manifestEntry.getData().toString("utf8"),
    ) as BackupManifest;
    if (
      manifest.app !== "Resturanet" ||
      manifest.version !== 1 ||
      manifest.schemaVersion < 1 ||
      manifest.schemaVersion > CURRENT_SCHEMA_VERSION
    )
      throw new Error("نسخة احتياطية غير متوافقة");

    const safetyDir = join(this.dataDir, "safety-backups");
    mkdirSync(safetyDir, { recursive: true });
    await this.writeBackup(
      join(safetyDir, `before-restore-${Date.now()}.resturanet-backup`),
    );

    const staging = join(tmpdir(), `resturanet-restore-${randomUUID()}`);
    mkdirSync(staging, { recursive: true });
    try {
      writeFileSync(join(staging, "database.sqlite"), databaseEntry.getData());
      mkdirSync(join(staging, "attachments"), { recursive: true });
      for (const entry of entries.filter((item) =>
        item.entryName.startsWith("attachments/"),
      )) {
        writeFileSync(
          join(staging, "attachments", basename(entry.entryName)),
          entry.getData(),
        );
      }
      this.manager.close();
      const oldDb = `${this.manager.path}.before-restore`;
      rmSync(oldDb, { force: true });
      if (existsSync(this.manager.path)) renameSync(this.manager.path, oldDb);
      copyFileSync(join(staging, "database.sqlite"), this.manager.path);
      rmSync(this.attachmentsDir, { recursive: true, force: true });
      mkdirSync(this.attachmentsDir, { recursive: true });
      for (const name of readdirSync(join(staging, "attachments")))
        copyFileSync(
          join(staging, "attachments", name),
          join(this.attachmentsDir, name),
        );
      this.manager.reopen();
      this.onRestored();
      rmSync(oldDb, { force: true });
      return {
        canceled: false,
        restored: true,
        message:
          this.getLocale() === "en"
            ? "Backup restored successfully"
            : "تم استرجاع النسخة الاحتياطية بنجاح",
      };
    } catch (error) {
      if (!this.manager.db.open) this.manager.reopen();
      throw error;
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
  }
}
