import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "../..");
const cursorDir = path.join(root, ".cursor");
const errors = [];
const stats = { rules: 0, agents: 0, skills: 0, commands: 0, references: 0 };

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function filesIn(relativeDir, extension) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    fail(`Missing required directory: ${relativeDir}`);
    return [];
  }
  return fs
    .readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(relativeDir, entry.name))
    .sort();
}

function walkFiles(relativeDir, extensions) {
  const result = [];
  const visit = (currentRelativeDir) => {
    const currentAbsoluteDir = path.join(root, currentRelativeDir);
    for (const entry of fs.readdirSync(currentAbsoluteDir, {
      withFileTypes: true,
    })) {
      const relativePath = path.join(currentRelativeDir, entry.name);
      if (entry.isDirectory()) visit(relativePath);
      else if (extensions.some((extension) => entry.name.endsWith(extension))) {
        result.push(relativePath);
      }
    }
  };
  visit(relativeDir);
  return result.sort();
}

function parseFrontmatter(relativePath, content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    fail(`${relativePath}: missing YAML frontmatter`);
    return {};
  }

  return Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.+)$/))
      .filter(Boolean)
      .map((matchLine) => [matchLine[1], matchLine[2].trim()]),
  );
}

function checkLineLimit(relativePath, content, maximum) {
  const lines = content.trimEnd().split("\n").length;
  if (lines > maximum) {
    fail(`${relativePath}: ${lines} lines exceeds focused limit ${maximum}`);
  }
}

const required = [
  "AGENTS.md",
  ".cursor/README.md",
  ".cursor/PROJECT_CONTEXT.md",
  ".cursor/prompt.md",
  ".cursor/cli.json",
  ".cursorignore",
  ".gitignore",
];
required.forEach(read);

if (fs.existsSync(path.join(cursorDir, "settings.json"))) {
  fail(
    ".cursor/settings.json is unsupported here; use documented Cursor files",
  );
}
if (
  fs
    .readdirSync(cursorDir, { withFileTypes: true })
    .some((entry) => entry.isDirectory() && entry.name === "Agents")
) {
  fail("Use canonical lowercase .cursor/agents, not .cursor/Agents");
}

try {
  const cli = JSON.parse(read(".cursor/cli.json"));
  if (!Array.isArray(cli?.permissions?.deny)) {
    fail(".cursor/cli.json: permissions.deny must be an array");
  }
} catch (error) {
  fail(`.cursor/cli.json: invalid JSON (${error.message})`);
}

let alwaysRules = 0;
for (const relativePath of filesIn(".cursor/rules", ".mdc")) {
  const content = read(relativePath);
  const metadata = parseFrontmatter(relativePath, content);
  stats.rules += 1;
  checkLineLimit(relativePath, content, 100);
  if (!metadata.description) fail(`${relativePath}: missing description`);
  if (!["true", "false"].includes(metadata.alwaysApply)) {
    fail(`${relativePath}: alwaysApply must be true or false`);
  }
  if (metadata.alwaysApply === "true") alwaysRules += 1;
}
if (alwaysRules !== 1) {
  fail(`Expected exactly one always-applied rule, found ${alwaysRules}`);
}

for (const relativePath of filesIn(".cursor/agents", ".md")) {
  const content = read(relativePath);
  const metadata = parseFrontmatter(relativePath, content);
  const base = path.basename(relativePath, ".md");
  stats.agents += 1;
  checkLineLimit(relativePath, content, 100);
  if (metadata.name !== base) {
    fail(`${relativePath}: name must match filename (${base})`);
  }
  if (!metadata.description || metadata.description.length < 40) {
    fail(`${relativePath}: description is too vague`);
  }
  if (metadata.model !== "inherit") {
    fail(`${relativePath}: reviewer model must be inherit`);
  }
  if (metadata.readonly !== "true") {
    fail(`${relativePath}: reviewer must be readonly`);
  }
}

const skillsDir = path.join(cursorDir, "skills");
for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const relativePath = `.cursor/skills/${entry.name}/SKILL.md`;
  const content = read(relativePath);
  const metadata = parseFrontmatter(relativePath, content);
  stats.skills += 1;
  checkLineLimit(relativePath, content, 160);
  if (metadata.name !== entry.name) {
    fail(`${relativePath}: name must match directory (${entry.name})`);
  }
  if (!metadata.description || metadata.description.length < 40) {
    fail(`${relativePath}: description is too vague`);
  }
}

for (const relativePath of filesIn(".cursor/commands", ".md")) {
  const content = read(relativePath);
  stats.commands += 1;
  checkLineLimit(relativePath, content, 100);
  if (!content.startsWith("# ") || content.trim().length < 200) {
    fail(`${relativePath}: command needs a title and executable workflow`);
  }
}

for (const relativePath of filesIn(".cursor/reference", ".md")) {
  const content = read(relativePath);
  stats.references += 1;
  checkLineLimit(relativePath, content, 180);
  if (!content.startsWith("# ")) fail(`${relativePath}: missing title`);
}

const contextFiles = ["AGENTS.md", ...walkFiles(".cursor", [".md", ".mdc"])];
for (const relativePath of contextFiles) {
  const content = read(relativePath);
  if (/\/Users\/|[A-Z]:\\Users\\/.test(content)) {
    fail(`${relativePath}: contains a machine-specific absolute path`);
  }
  for (const match of content.matchAll(/@(\.cursor\/[\w./-]+\.(?:md|mdc))/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) {
      fail(`${relativePath}: unresolved Cursor reference ${match[1]}`);
    }
  }
}

if (stats.agents < 3 || stats.skills < 5 || stats.commands < 5) {
  fail(`Toolkit is unexpectedly incomplete: ${JSON.stringify(stats)}`);
}

if (errors.length > 0) {
  console.error("Resturanet agent workspace validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Resturanet agent workspace is valid: ${stats.rules} rules, ${stats.agents} reviewers, ${stats.skills} skills, ${stats.commands} commands, ${stats.references} references.`,
  );
}
