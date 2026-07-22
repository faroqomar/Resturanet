const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appPath = join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );
  const clean = spawnSync("/usr/bin/xattr", ["-crs", appPath], {
    encoding: "utf8",
  });
  if (clean.status !== 0) {
    throw new Error(clean.stderr || "تعذر تنظيف سمات حزمة التطبيق");
  }
  const result = spawnSync(
    "/usr/bin/codesign",
    ["--force", "--deep", "--sign", "-", appPath],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || "تعذر إنشاء التوقيع المحلي للتطبيق");
  }

  const verify = spawnSync(
    "/usr/bin/codesign",
    ["--verify", "--deep", "--strict", appPath],
    { encoding: "utf8" },
  );
  if (verify.status !== 0) {
    throw new Error(verify.stderr || "تعذر التحقق من توقيع التطبيق");
  }
};
