import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCorpusPosts, parseCsv } from "../retrieval/apify-media-retrieval.mjs";
import { buildExtractionInput, runModelAdapter } from "./model-adapter.mjs";
import { approvedQwenModel } from "./qwen-adapter.mjs";

const maximumBatchSize = 10;

function parseArguments(args) {
  const options = { execute: false, postIds: [], maxPosts: null, approvedSpendIdr: null };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--execute") options.execute = true;
    else if (argument === "--post-id") options.postIds.push(args[++index]);
    else if (argument === "--max-posts") options.maxPosts = Number(args[++index]);
    else if (argument === "--approved-spend-idr") options.approvedSpendIdr = Number(args[++index]);
    else throw new TypeError(`Unknown argument: ${argument}`);
  }
  return options;
}

async function loadEnvFileIfPresent(root) {
  try {
    const text = await fs.readFile(path.join(root, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function selectPosts(corpusText, options) {
  const rows = parseCsv(corpusText);
  const [headers, ...data] = rows;
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const posts = parseCorpusPosts(corpusText);
  const captions = new Map(data.filter((row) => row.some(Boolean)).map((row) => [
    row[indexes.post_id], row[indexes.caption] ?? "",
  ]));
  let selected;
  if (options.postIds.length > 0) {
    selected = posts.filter((post) => options.postIds.includes(post.post_id));
    const missing = options.postIds.filter((postId) => !selected.some((post) => post.post_id === postId));
    if (missing.length > 0) throw new TypeError(`Unknown post ID(s): ${missing.join(", ")}`);
  } else if (Number.isInteger(options.maxPosts) && options.maxPosts > 0) {
    selected = posts.slice(0, options.maxPosts);
  } else {
    throw new TypeError("Select posts with --post-id or --max-posts");
  }
  if (selected.length === 0 || selected.length > maximumBatchSize) {
    throw new TypeError(`Select between 1 and ${maximumBatchSize} posts`);
  }
  return selected.map((post) => ({ ...post, caption: captions.get(post.post_id) ?? "" }));
}

async function buildLocalInputs(posts, mediaRoot, rawRoot) {
  const inputs = [];
  for (const post of posts) {
    const manifestPath = path.join(rawRoot, `${post.post_id}.manifest.json`);
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (manifest.post_id !== post.post_id || manifest.permalink !== post.permalink) {
      throw new TypeError(`Manifest identity mismatch for ${post.post_id}`);
    }
    if (!Array.isArray(manifest.media) || manifest.media.length === 0) {
      throw new TypeError(`Media manifest is incomplete for ${post.post_id}`);
    }
    inputs.push(buildExtractionInput({
      status: "success",
      raw_post: {
        provider_external_id: post.post_id,
        permalink: post.permalink,
        caption: post.caption,
        media: manifest.media.map((media) => ({
          position: media.position,
          media_type: media.media_type,
          storage_uri: path.resolve(mediaRoot, post.post_id, media.filename),
        })),
      },
    }));
  }
  return inputs;
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, "../..");
  await loadEnvFileIfPresent(root);
  const options = parseArguments(process.argv.slice(2));
  const corpusText = await fs.readFile(path.join(root, "phase0/corpus/pilot-posts.csv"), "utf8");
  const posts = selectPosts(corpusText, options);
  const inputs = await buildLocalInputs(posts, path.join(root, "phase0/media"), path.join(root, "phase0/raw"));
  const plan = {
    provider: "alibaba-cloud-model-studio-singapore",
    model: process.env.QWEN_MODEL || approvedQwenModel,
    post_ids: inputs.map((input) => input.source_post_id),
    media_counts: inputs.map((input) => input.media.length),
    provider_call: false,
    approved_spend_idr: options.approvedSpendIdr,
  };

  if (!options.execute) {
    console.log(JSON.stringify({ mode: "plan", ...plan }, null, 2));
    return;
  }
  if (!Number.isFinite(options.approvedSpendIdr) || options.approvedSpendIdr <= 0) {
    throw new TypeError("--approved-spend-idr is required for live execution");
  }
  if (!process.env.QWEN_API_KEY || !process.env.QWEN_BASE_URL) {
    throw new TypeError("QWEN_API_KEY and QWEN_BASE_URL are required for live execution");
  }
  throw new TypeError("Live execution is intentionally disabled until the product owner approves a metered Qwen batch and cost accounting");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
