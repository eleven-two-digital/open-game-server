// SPDX-License-Identifier: Apache-2.0

import { execFileSync, spawn } from "node:child_process";
import { createWriteStream, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { describe, expect, it } from "vitest";

const sampleRoot = resolve(process.cwd());
const imageScanEnabled = process.env.AIMDUCK_SECURITY_IMAGE_SCAN === "1";
const generatedMaterialPatterns = [
  "infra/dev-certs/",
  "infra/local-secrets/",
  "*.key",
  "*.pem",
  "*.p12",
  "*.pfx",
  "*.crt",
  "*.cer",
  "*.ticket",
  ".env*",
];

describe("generated security artifacts", () => {
  it("excludes generated certificates, keys, tickets, and environment files from Docker contexts", () => {
    const dockerIgnore = readFileSync(join(sampleRoot, ".dockerignore"), "utf8");
    const ignorePatterns = new Set(
      dockerIgnore
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "" && !line.startsWith("#")),
    );

    expect([...ignorePatterns]).toEqual(expect.arrayContaining(generatedMaterialPatterns));
  });

  it.skipIf(!imageScanEnabled)(
    "keeps generated security artifacts out of every built service image layer",
    async () => {
      const images = JSON.parse(
        execFileSync(
          "docker",
          ["compose", "images", "--format", "json", "client", "discovery", "room-1", "room-2"],
          {
            cwd: sampleRoot,
            encoding: "utf8",
          },
        ),
      ) as Array<{ Repository: string; Tag: string }>;
      const imageReferences = [
        ...new Set(images.map((image) => `${image.Repository}:${image.Tag}`)),
      ];
      expect(imageReferences.length).toBeGreaterThanOrEqual(3);

      const scanDirectory = mkdtempSync(join(tmpdir(), "aimduck-image-scan-"));
      try {
        const scannedLayers = new Set<string>();
        let layerIndex = 0;
        for (const [imageIndex, imageReference] of imageReferences.entries()) {
          const archivePath = join(scanDirectory, `image-${imageIndex}.tar`);
          execFileSync("docker", ["image", "save", "--output", archivePath, imageReference]);

          const manifest = JSON.parse(
            execFileSync("tar", ["-xOf", archivePath, "manifest.json"], {
              encoding: "utf8",
            }),
          ) as Array<{ Layers: string[] }>;
          const layerPaths = manifest.flatMap((image) => image.Layers);

          for (const layerPath of layerPaths) {
            if (scannedLayers.has(layerPath)) {
              continue;
            }
            const layerArchivePath = join(scanDirectory, `layer-${layerIndex++}.tar`);
            await extractLayer(archivePath, layerPath, layerArchivePath);
            const sensitiveEntries = await listSensitiveEntries(layerArchivePath);
            scannedLayers.add(layerPath);
            expect(sensitiveEntries, `${imageReference} layer ${layerPath}`).toEqual([]);
          }
        }
      } finally {
        rmSync(scanDirectory, { recursive: true, force: true });
      }
    },
    120_000,
  );
});

async function extractLayer(
  archivePath: string,
  layerPath: string,
  extractedLayerPath: string,
): Promise<void> {
  const extract = spawn("tar", ["-xOf", archivePath, layerPath]);
  let stderr = "";
  extract.stderr.setEncoding("utf8");
  extract.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const extractStatus = new Promise<void>((resolvePromise, reject) => {
    extract.on("error", reject);
    extract.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`Could not extract Docker image layer: ${stderr.trim()}`));
      }
    });
  });
  const extractOutput = pipeline(
    extract.stdout,
    createWriteStream(extractedLayerPath, { flags: "wx" }),
  );
  try {
    await Promise.all([extractStatus, extractOutput]);
  } catch (error) {
    extract.kill();
    throw error;
  }
}

function listSensitiveEntries(extractedLayerPath: string): Promise<string[]> {
  return new Promise((resolvePromise, reject) => {
    const list = spawn("tar", ["-tf", extractedLayerPath]);
    const matches: string[] = [];
    let pending = "";
    let stderr = "";
    list.stdout.setEncoding("utf8");
    list.stdout.on("data", (chunk: string) => {
      const lines = `${pending}${chunk}`.split(/\r?\n/);
      pending = lines.pop() ?? "";
      matches.push(...lines.filter(isSensitiveImageEntry));
    });
    list.stderr.setEncoding("utf8");
    list.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    list.on("error", reject);
    list.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Could not list Docker image layer entries: ${stderr.trim()}`));
        return;
      }
      if (isSensitiveImageEntry(pending)) {
        matches.push(pending);
      }
      resolvePromise(matches);
    });
  });
}

function isSensitiveImageEntry(entry: string): boolean {
  const normalized = entry.replace(/^\.\//, "");
  return (
    /(?:^|\/)[^/]+\.(?:key|ticket)$/i.test(normalized) ||
    /(?:^|\/)\.env(?:\.[^/]*)?$/i.test(normalized) ||
    /(?:^|\/)infra\/(?:dev-certs|local-secrets)\/.*\.(?:pem|p12|pfx|crt|cer)$/i.test(normalized)
  );
}
