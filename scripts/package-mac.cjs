const {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = resolve(__dirname, "..");
const temporaryOutput = mkdtempSync(join(tmpdir(), "resturanet-build-"));
const releaseDirectory = join(projectRoot, "release");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`فشل الأمر: ${command} ${args.join(" ")}`);
  }
}

try {
  run("npm", ["run", "build"]);
  run(join(projectRoot, "node_modules", ".bin", "electron-builder"), [
    "--mac",
    "--arm64",
    `--config.directories.output=${temporaryOutput}`,
  ]);

  const artifacts = readdirSync(temporaryOutput).filter(
    (name) => name.endsWith(".dmg") || name.endsWith(".dmg.blockmap"),
  );
  if (!artifacts.some((name) => name.endsWith(".dmg"))) {
    throw new Error("لم ينتج ملف DMG");
  }

  mkdirSync(releaseDirectory, { recursive: true });
  for (const artifact of artifacts) {
    copyFileSync(
      join(temporaryOutput, artifact),
      join(releaseDirectory, artifact),
    );
  }

  rmSync(temporaryOutput, { recursive: true, force: true });
  console.log(`تم إنشاء ملفات التثبيت في ${releaseDirectory}`);
} catch (error) {
  console.error(`احتُفظ بمخرجات البناء للتشخيص في ${temporaryOutput}`);
  throw error;
}
