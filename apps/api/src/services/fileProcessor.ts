import * as fs from "fs";
import * as path from "path";
import ignore, { type Ignore } from "ignore";
import { logger } from "../lib/logger";

// ─── Default ignores ──────────────────────────────────────────────────────────
// Directories and file patterns that are never useful for AI indexing.

const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  "vendor",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "venv",
  ".venv",
  "env",
  ".env",
  "target",       // Rust / Java
  "coverage",
  ".nyc_output",
  ".cache",
  "tmp",
  "temp",
  ".turbo",
  ".vercel",
]);

const IGNORED_EXTENSIONS = new Set([
  // Binaries
  ".exe", ".dll", ".so", ".dylib", ".bin", ".out",
  // Media
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".bmp", ".tiff",
  ".mp4", ".mp3", ".wav", ".ogg", ".flac", ".avi", ".mov",
  // Fonts
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  // Archives
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  // Database / binary data
  ".db", ".sqlite", ".sqlite3",
  // Package manager locks
  ".lock",
  // Maps and minified
  ".map",
  // PDFs and docs
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
]);

const IGNORED_FILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".DS_Store",
  "Thumbs.db",
]);

// Max file size to read (500 KB). Larger files are skipped.
const MAX_FILE_SIZE_BYTES = 500 * 1024;

// Chunk settings
const CHUNK_LINES = 50;
const OVERLAP_LINES = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileChunk {
  content: string;
  startLine: number; // 1-indexed
  endLine: number;   // 1-indexed
  tokenCount: number;
}

export interface ProcessedFile {
  relativePath: string;
  language: string | null;
  size: number;
  lineCount: number;
  chunks: FileChunk[];
}

// ─── Ignore Filter ────────────────────────────────────────────────────────────

/**
 * Builds an `ignore` instance that merges the repo's .gitignore (if present)
 * with our default ignore patterns.
 */
export function getIgnoreFilter(repoPath: string): Ignore {
  const ig = ignore();

  // Read .gitignore if present
  const gitignorePath = path.join(repoPath, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, "utf-8");
      ig.add(content);
    } catch {
      // Non-fatal — proceed without .gitignore
    }
  }

  return ig;
}

// ─── Hard File Ignores ────────────────────────────────────────────────────────

/**
 * Returns true if the file should always be ignored regardless of .gitignore.
 */
export function shouldIgnoreFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath);
  return (
    IGNORED_EXTENSIONS.has(ext) ||
    IGNORED_FILE_NAMES.has(base) ||
    base.endsWith(".min.js") ||
    base.endsWith(".min.css") ||
    base.startsWith(".")     // hidden files (e.g. .eslintcache)
  );
}

// ─── File Walker ──────────────────────────────────────────────────────────────

export interface WalkedFile {
  absolutePath: string;
  relativePath: string;
}

/**
 * Recursively walks `dir`, yielding every file that should be indexed.
 * Skips DEFAULT_IGNORE_DIRS, gitignore-matched paths, and hard-ignored extensions.
 */
export async function* walkFiles(
  dir: string,
  ig: Ignore,
  baseDir: string = dir
): AsyncGenerator<WalkedFile> {
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, absolutePath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      // Skip default ignored directories by name
      if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
      // Skip gitignore-matched directories
      if (ig.ignores(relativePath + "/")) continue;

      yield* walkFiles(absolutePath, ig, baseDir);
    } else if (entry.isFile()) {
      // Hard ignore first (fast check)
      if (shouldIgnoreFile(entry.name)) continue;
      // gitignore check
      if (ig.ignores(relativePath)) continue;

      // Size check
      try {
        const stat = fs.statSync(absolutePath);
        if (stat.size > MAX_FILE_SIZE_BYTES) {
          logger.debug(`Skipping large file: ${relativePath} (${stat.size} bytes)`);
          continue;
        }
      } catch {
        continue;
      }

      yield { absolutePath, relativePath };
    }
  }
}

// ─── Language Detection ───────────────────────────────────────────────────────

const EXT_TO_LANGUAGE: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".rb": "Ruby",
  ".java": "Java",
  ".kt": "Kotlin",
  ".go": "Go",
  ".rs": "Rust",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".cc": "C++",
  ".cs": "C#",
  ".php": "PHP",
  ".swift": "Swift",
  ".scala": "Scala",
  ".sh": "Shell",
  ".bash": "Shell",
  ".zsh": "Shell",
  ".sql": "SQL",
  ".html": "HTML",
  ".htm": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "SCSS",
  ".less": "Less",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".xml": "XML",
  ".md": "Markdown",
  ".mdx": "Markdown",
  ".graphql": "GraphQL",
  ".gql": "GraphQL",
  ".tf": "Terraform",
  ".hcl": "HCL",
  ".prisma": "Prisma",
  ".proto": "Protobuf",
};

export function detectLanguage(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_LANGUAGE[ext] ?? null;
}

// ─── Token Estimation ─────────────────────────────────────────────────────────

/**
 * Rough token estimate: ~4 characters per token (GPT-4 average for code).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Chunker ─────────────────────────────────────────────────────────────────

/**
 * Splits file content into overlapping line-based chunks.
 *
 * chunk_size  = CHUNK_LINES  (50 lines per chunk)
 * overlap     = OVERLAP_LINES (10 lines shared between adjacent chunks)
 *
 * This overlap ensures that code spanning chunk boundaries (e.g., a function
 * split across two chunks) still has full context in both chunks.
 */
export function splitIntoChunks(content: string): FileChunk[] {
  const lines = content.split("\n");

  if (lines.length === 0) return [];

  const chunks: FileChunk[] = [];
  let startIdx = 0; // 0-indexed

  while (startIdx < lines.length) {
    const endIdx = Math.min(startIdx + CHUNK_LINES - 1, lines.length - 1);
    const chunkLines = lines.slice(startIdx, endIdx + 1);
    const chunkContent = chunkLines.join("\n");

    if (chunkContent.trim().length > 0) {
      chunks.push({
        content: chunkContent,
        startLine: startIdx + 1,  // 1-indexed
        endLine: endIdx + 1,       // 1-indexed
        tokenCount: estimateTokens(chunkContent),
      });
    }

    // Advance by (CHUNK_LINES - OVERLAP_LINES) to create overlap
    startIdx += CHUNK_LINES - OVERLAP_LINES;

    // Safety: if we're near the end and the remaining lines are already
    // covered by the overlap, stop to avoid tiny duplicate chunks.
    if (startIdx >= lines.length) break;
    if (lines.length - startIdx < OVERLAP_LINES) break;
  }

  return chunks;
}

// ─── Full File Processor ──────────────────────────────────────────────────────

/**
 * Reads a single file, detects language, splits into chunks.
 * Returns null if the file cannot be read as UTF-8 (binary, etc.).
 */
export function processFile(
  absolutePath: string,
  relativePath: string
): ProcessedFile | null {
  let content: string;

  try {
    content = fs.readFileSync(absolutePath, "utf-8");
  } catch {
    return null;
  }

  const lines = content.split("\n");
  const size = Buffer.byteLength(content, "utf-8");

  return {
    relativePath,
    language: detectLanguage(relativePath),
    size,
    lineCount: lines.length,
    chunks: splitIntoChunks(content),
  };
}
