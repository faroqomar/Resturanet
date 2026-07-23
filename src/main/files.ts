import type Database from "better-sqlite3";
import { dialog, shell } from "electron";
import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import {
  basename,
  extname,
  isAbsolute,
  join,
  normalize,
  resolve,
} from "node:path";
import type {
  Attachment,
  EntityType,
  PendingAttachment,
  AppLocale,
} from "../shared/contracts";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".pdf"]);
const mimeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

interface PendingRecord extends PendingAttachment {
  storedName: string;
  absolutePath: string;
}

export class AttachmentService {
  private readonly pending = new Map<string, PendingRecord>();
  readonly attachmentsDir: string;
  private readonly pendingDir: string;

  constructor(
    private readonly db: () => Database.Database,
    dataDir: string,
    private readonly getLocale: () => AppLocale,
  ) {
    this.attachmentsDir = join(dataDir, "attachments");
    this.pendingDir = join(dataDir, "pending");
    mkdirSync(this.attachmentsDir, { recursive: true });
    mkdirSync(this.pendingDir, { recursive: true });
  }

  async pick(): Promise<PendingAttachment[]> {
    const english = this.getLocale() === "en";
    const result = await dialog.showOpenDialog({
      title: english
        ? "Choose invoice images or PDF files"
        : "اختر صور الفاتورة أو ملفات PDF",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: english ? "Images and PDF" : "الصور وPDF",
          extensions: ["jpg", "jpeg", "png", "pdf"],
        },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths.map((source) => this.stage(source));
  }

  private stage(source: string): PendingAttachment {
    if (!isAbsolute(source)) throw new Error("مسار المرفق غير صالح");
    const extension = extname(source).toLowerCase();
    if (!allowedExtensions.has(extension))
      throw new Error("نوع الملف غير مدعوم");
    const size = statSync(source).size;
    if (size > MAX_FILE_SIZE) throw new Error("حجم الملف أكبر من 25 ميغابايت");
    const token = randomUUID();
    const storedName = `${randomUUID()}${extension}`;
    const absolutePath = this.safePath(this.pendingDir, storedName);
    copyFileSync(source, absolutePath);
    const record: PendingRecord = {
      token,
      storedName,
      absolutePath,
      originalName: basename(source).slice(0, 240),
      mimeType: mimeByExtension[extension],
      size,
      previewUrl:
        extension === ".pdf"
          ? null
          : this.dataUrl(absolutePath, mimeByExtension[extension]),
    };
    this.pending.set(token, record);
    return {
      token,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size,
      previewUrl: record.previewUrl,
    };
  }

  commit(
    tokens: string[] | undefined,
    entityType: EntityType,
    entityId: string,
  ): void {
    if (!tokens?.length) return;
    const insert = this.db().prepare(
      "INSERT INTO attachments(id,entity_type,entity_id,stored_name,original_name,mime_type,size) VALUES (?,?,?,?,?,?,?)",
    );
    const transaction = this.db().transaction(() => {
      for (const token of tokens) {
        const record = this.pending.get(token);
        if (!record)
          throw new Error("انتهت صلاحية أحد المرفقات، اختره مرة أخرى");
        const destination = this.safePath(
          this.attachmentsDir,
          record.storedName,
        );
        renameSync(record.absolutePath, destination);
        insert.run(
          randomUUID(),
          entityType,
          entityId,
          record.storedName,
          record.originalName,
          record.mimeType,
          record.size,
        );
        this.pending.delete(token);
      }
    });
    transaction();
  }

  discard(token: string): void {
    const record = this.pending.get(token);
    if (!record) return;
    rmSync(record.absolutePath, { force: true });
    this.pending.delete(token);
  }

  list(entityType: EntityType, entityId: string): Attachment[] {
    const rows = this.db()
      .prepare(
        "SELECT * FROM attachments WHERE entity_type=? AND entity_id=? ORDER BY created_at",
      )
      .all(entityType, entityId) as Array<Record<string, any>>;
    return rows.map((row) => {
      const filePath = this.safePath(this.attachmentsDir, row.stored_name);
      return {
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        originalName: row.original_name,
        mimeType: row.mime_type,
        size: Number(row.size),
        previewUrl: row.mime_type.startsWith("image/")
          ? this.dataUrl(filePath, row.mime_type)
          : null,
      };
    });
  }

  async open(id: string): Promise<void> {
    const row = this.db()
      .prepare("SELECT stored_name FROM attachments WHERE id=?")
      .get(id) as { stored_name: string } | undefined;
    if (!row) throw new Error("المرفق غير موجود");
    const result = await shell.openPath(
      this.safePath(this.attachmentsDir, row.stored_name),
    );
    if (result) throw new Error(`تعذر فتح الملف: ${result}`);
  }

  removeEntityFiles(
    entityType: EntityType | "supplier",
    entityId: string,
  ): void {
    const rows = this.db()
      .prepare(
        "SELECT stored_name FROM attachments WHERE entity_type=? AND entity_id=?",
      )
      .all(entityType, entityId) as Array<{ stored_name: string }>;
    for (const row of rows)
      rmSync(this.safePath(this.attachmentsDir, row.stored_name), {
        force: true,
      });
    this.db()
      .prepare("DELETE FROM attachments WHERE entity_type=? AND entity_id=?")
      .run(entityType, entityId);
  }

  private safePath(root: string, name: string): string {
    if (name !== basename(name) || name.includes(".."))
      throw new Error("اسم الملف غير صالح");
    const candidate = resolve(root, normalize(name));
    const prefix = `${resolve(root)}/`;
    if (!candidate.startsWith(prefix))
      throw new Error("مسار الملف خارج مجلد التطبيق");
    return candidate;
  }

  private dataUrl(path: string, mime: string): string {
    return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
  }
}
