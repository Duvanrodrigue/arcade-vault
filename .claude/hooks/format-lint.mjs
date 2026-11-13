import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";

const IGNORED_DIRS = ["node_modules", ".next", "references", ".git"];
const LINT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let filePath;
try {
  filePath = JSON.parse(raw)?.tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!filePath) process.exit(0);

const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const file = resolve(filePath);
const rel = relative(root, file);

if (rel.startsWith("..") || resolve(rel) === rel || !existsSync(file)) {
  process.exit(0);
}
if (rel.split(sep).some((part) => IGNORED_DIRS.includes(part))) {
  process.exit(0);
}

const run = (args) =>
  spawnSync(`npx --no-install ${args.join(" ")}`, {
    cwd: root,
    shell: true,
    encoding: "utf8",
  });

const prettier = run(["prettier", "--write", "--ignore-unknown", `"${file}"`]);
if (prettier.status !== 0) {
  process.stderr.write(
    `Prettier failed for ${rel}:\n${prettier.stdout}${prettier.stderr}`,
  );
  process.exit(2);
}

if (LINT_EXTS.has(extname(file))) {
  const eslint = run(["eslint", "--fix", `"${file}"`]);
  if (eslint.status !== 0) {
    process.stderr.write(
      `ESLint errors in ${rel} (fix them):\n${eslint.stdout}${eslint.stderr}`,
    );
    process.exit(2);
  }
}
