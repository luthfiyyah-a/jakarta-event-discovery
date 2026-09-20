import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const slidePattern = /^slide-(\d{2})\.(jpe?g|png|webp)$/i;

export async function inspectMediaLayout(mediaRoot, postIds) {
  const knownPostIds = new Set(postIds);
  let rootEntries = [];
  try {
    rootEntries = await fs.readdir(mediaRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const directoryNames = new Set(rootEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  const unknown_directories = [...directoryNames].filter((name) => !knownPostIds.has(name)).sort();
  const unexpected_root_files = rootEntries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  const missing_posts = postIds.filter((postId) => !directoryNames.has(postId));
  const invalid_posts = [];

  for (const postId of postIds) {
    if (!directoryNames.has(postId)) continue;
    const entries = await fs.readdir(path.join(mediaRoot, postId), { withFileTypes: true });
    const unexpected = entries.filter((entry) => !entry.isFile() || !slidePattern.test(entry.name)).map((entry) => entry.name);
    const positions = entries
      .filter((entry) => entry.isFile() && slidePattern.test(entry.name))
      .map((entry) => Number(slidePattern.exec(entry.name)[1]))
      .sort((a, b) => a - b);
    const expectedPositions = Array.from({ length: positions.length }, (_, index) => index + 1);

    if (unexpected.length > 0 || positions.length === 0 || positions.some((position, index) => position !== expectedPositions[index])) {
      invalid_posts.push({ post_id: postId, positions, unexpected_entries: unexpected.sort() });
    }
  }

  return {
    corpus_posts: postIds.length,
    posts_with_media_directories: postIds.length - missing_posts.length,
    layout_valid: missing_posts.length === 0
      && invalid_posts.length === 0
      && unknown_directories.length === 0
      && unexpected_root_files.length === 0,
    source_completeness_verified: false,
    missing_posts,
    invalid_posts,
    unknown_directories,
    unexpected_root_files,
  };
}

async function readCorpusPostIds(corpusPath) {
  const text = await fs.readFile(corpusPath, "utf8");
  return text
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => line.split(",", 1)[0].replace(/^"|"$/g, ""));
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const mediaRoot = process.argv[2] ?? path.join(here, "media");
  const corpusPath = path.join(here, "corpus", "pilot-posts.csv");
  const postIds = await readCorpusPostIds(corpusPath);
  const report = await inspectMediaLayout(mediaRoot, postIds);
  console.log(JSON.stringify(report, null, 2));
  if (!report.layout_valid) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
