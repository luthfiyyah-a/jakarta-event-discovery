import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const actorId = "apify~instagram-scraper";
const terminalStatuses = new Set(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]);
const maximumBatchSize = 10;
const maximumChargeUsd = 0.05;

export class ApifyRetrievalError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ApifyRetrievalError";
    this.code = code;
  }
}

export function buildActorInput(posts) {
  if (!Array.isArray(posts) || posts.length === 0 || posts.length > maximumBatchSize) {
    throw new TypeError(`posts must contain between 1 and ${maximumBatchSize} items`);
  }
  return {
    directUrls: posts.map((post) => post.permalink),
    resultsType: "posts",
    resultsLimit: 1,
    addParentData: false,
  };
}

function mediaUrl(item) {
  return item.displayUrl ?? item.imageUrl ?? item.images?.[0] ?? item.videoUrl ?? null;
}

function mediaType(item) {
  const type = String(item.type ?? item.mediaType ?? "").toLowerCase();
  return type.includes("video") || item.videoUrl ? "video" : "image";
}

export function extractOrderedMedia(item) {
  const children = Array.isArray(item.childPosts) && item.childPosts.length > 0
    ? item.childPosts
    : null;
  let media;

  if (children) {
    media = children.map((child, index) => ({
      position: index + 1,
      media_type: mediaType(child),
      source_url: mediaUrl(child),
    }));
  } else if (Array.isArray(item.images) && item.images.length > 1) {
    media = item.images.map((sourceUrl, index) => ({
      position: index + 1,
      media_type: "image",
      source_url: sourceUrl,
    }));
  } else {
    media = [{
      position: 1,
      media_type: mediaType(item),
      source_url: mediaUrl(item),
    }];
  }

  for (const entry of media) {
    if (!entry.source_url) {
      throw new ApifyRetrievalError("MISSING_MEDIA_URL", `Media position ${entry.position} has no downloadable URL`);
    }
  }
  return media;
}

export function matchPostsToResults(posts, items) {
  return posts.map((post) => {
    const result = items.find((item) => item.shortCode === post.shortcode
      || item.url === post.permalink
      || item.inputUrl === post.permalink);
    if (!result) {
      throw new ApifyRetrievalError("POST_RESULT_MISSING", `No dataset result matched ${post.post_id}`);
    }
    return { post, result };
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export function parseCorpusPosts(csvText) {
  const [headers, ...rows] = parseCsv(csvText);
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  for (const required of ["post_id", "permalink", "shortcode"]) {
    if (indexes[required] === undefined) throw new TypeError(`Corpus CSV is missing ${required}`);
  }
  return rows.filter((row) => row.some(Boolean)).map((row) => ({
    post_id: row[indexes.post_id],
    permalink: row[indexes.permalink],
    shortcode: row[indexes.shortcode],
  }));
}

async function apiRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new ApifyRetrievalError("APIFY_API_ERROR", `Apify API returned HTTP ${response.status}`);
  }
  return response.json();
}

async function waitForRun(run, token) {
  let current = run;
  for (let attempt = 0; attempt < 60 && !terminalStatuses.has(current.status); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await apiRequest(`https://api.apify.com/v2/actor-runs/${current.id}`, token);
    current = response.data;
  }
  if (!terminalStatuses.has(current.status)) {
    throw new ApifyRetrievalError("APIFY_RUN_TIMEOUT", `Apify run ${current.id} did not finish within the local wait limit`);
  }
  if (current.status !== "SUCCEEDED") {
    throw new ApifyRetrievalError("APIFY_RUN_FAILED", `Apify run ${current.id} finished with status ${current.status}`);
  }
  return current;
}

async function startActor(posts, token, chargeCapUsd) {
  const query = new URLSearchParams({ waitForFinish: "60", maxTotalChargeUsd: String(chargeCapUsd) });
  const response = await apiRequest(
    `https://api.apify.com/v2/acts/${actorId}/runs?${query}`,
    token,
    { method: "POST", body: JSON.stringify(buildActorInput(posts)) },
  );
  return waitForRun(response.data, token);
}

function extensionFor(contentType) {
  if (contentType.includes("image/jpeg")) return "jpg";
  if (contentType.includes("image/png")) return "png";
  if (contentType.includes("image/webp")) return "webp";
  throw new ApifyRetrievalError("UNSUPPORTED_MEDIA_TYPE", `Unsupported downloaded content type: ${contentType || "missing"}`);
}

async function downloadImage(sourceUrl) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new ApifyRetrievalError("MEDIA_DOWNLOAD_FAILED", `Media download returned HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  const extension = extensionFor(contentType);
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    bytes,
    extension,
    checksum_sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

async function savePostMedia(mediaRoot, rawRoot, post, result) {
  const media = extractOrderedMedia(result);
  if (media.some((item) => item.media_type !== "image")) {
    throw new ApifyRetrievalError("VIDEO_OUT_OF_SCOPE", `${post.post_id} contains video media outside the current image/carousel scope`);
  }

  const destination = path.join(mediaRoot, post.post_id);
  try {
    await fs.access(destination);
    throw new ApifyRetrievalError("MEDIA_ALREADY_EXISTS", `${post.post_id} already has a local media directory`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await fs.mkdir(mediaRoot, { recursive: true });
  await fs.mkdir(rawRoot, { recursive: true });
  const temporary = await fs.mkdtemp(path.join(mediaRoot, `.${post.post_id}-`));
  const manifest = [];
  try {
    for (const item of media) {
      const downloaded = await downloadImage(item.source_url);
      const filename = `slide-${String(item.position).padStart(2, "0")}.${downloaded.extension}`;
      await fs.writeFile(path.join(temporary, filename), downloaded.bytes);
      manifest.push({
        position: item.position,
        media_type: item.media_type,
        filename,
        checksum_sha256: downloaded.checksum_sha256,
      });
    }
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { recursive: true, force: true });
    throw error;
  }

  await fs.writeFile(path.join(rawRoot, `${post.post_id}.json`), `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(path.join(rawRoot, `${post.post_id}.manifest.json`), `${JSON.stringify({
    post_id: post.post_id,
    permalink: post.permalink,
    media: manifest,
  }, null, 2)}\n`);
  return { post_id: post.post_id, media_count: manifest.length };
}

export async function retrieveApifyMedia({ posts, token, mediaRoot, rawRoot, chargeCapUsd = maximumChargeUsd }) {
  if (!token) throw new TypeError("An Apify token is required");
  if (!Number.isFinite(chargeCapUsd) || chargeCapUsd <= 0 || chargeCapUsd > maximumChargeUsd) {
    throw new TypeError(`chargeCapUsd must be greater than 0 and no more than ${maximumChargeUsd}`);
  }
  const run = await startActor(posts, token, chargeCapUsd);
  const items = await apiRequest(
    `https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=1&format=json`,
    token,
  );
  await fs.mkdir(rawRoot, { recursive: true });
  await fs.writeFile(path.join(rawRoot, `apify-run-${run.id}.json`), `${JSON.stringify(items, null, 2)}\n`);

  const matched = matchPostsToResults(posts, items);
  const downloaded = [];
  for (const pair of matched) {
    downloaded.push(await savePostMedia(mediaRoot, rawRoot, pair.post, pair.result));
  }
  return {
    actor: "apify/instagram-scraper",
    run_id: run.id,
    run_status: run.status,
    charge_cap_usd: chargeCapUsd,
    usage_total_usd: run.usageTotalUsd ?? null,
    downloaded,
  };
}

function parseArguments(args) {
  const options = { execute: false, postIds: [], maxPosts: null, chargeCapUsd: maximumChargeUsd };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--execute") options.execute = true;
    else if (argument === "--post-id") options.postIds.push(args[++index]);
    else if (argument === "--max-posts") options.maxPosts = Number(args[++index]);
    else if (argument === "--max-charge-usd") options.chargeCapUsd = Number(args[++index]);
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

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, "../..");
  await loadEnvFileIfPresent(root);
  const options = parseArguments(process.argv.slice(2));
  if (!options.execute) {
    throw new TypeError("Refusing to call Apify without the explicit --execute flag");
  }
  const corpusText = await fs.readFile(path.join(root, "phase0/corpus/pilot-posts.csv"), "utf8");
  const corpusPosts = parseCorpusPosts(corpusText);
  let posts;
  if (options.postIds.length > 0) {
    const selected = new Set(options.postIds);
    posts = corpusPosts.filter((post) => selected.has(post.post_id));
    const missing = options.postIds.filter((postId) => !posts.some((post) => post.post_id === postId));
    if (missing.length > 0) throw new TypeError(`Unknown post ID(s): ${missing.join(", ")}`);
  } else if (Number.isInteger(options.maxPosts) && options.maxPosts > 0 && options.maxPosts <= maximumBatchSize) {
    posts = corpusPosts.slice(0, options.maxPosts);
  } else {
    throw new TypeError(`Select posts with --post-id or --max-posts between 1 and ${maximumBatchSize}`);
  }

  const token = process.env.INSTAGRAM_PROVIDER_API_KEY ?? process.env.APIFY_TOKEN ?? process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new TypeError("Set INSTAGRAM_PROVIDER_API_KEY in the environment or ignored .env file");
  }
  const report = await retrieveApifyMedia({
    posts,
    token,
    chargeCapUsd: options.chargeCapUsd,
    mediaRoot: path.join(root, "phase0/media"),
    rawRoot: path.join(root, "phase0/raw"),
  });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
