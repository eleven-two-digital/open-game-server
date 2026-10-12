// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { access, chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const certs = join(root, "infra", "dev-certs");
const secrets = join(root, "infra", "local-secrets");

await mkdir(certs, { recursive: true, mode: 0o700 });
await mkdir(secrets, { recursive: true, mode: 0o700 });
await chmod(certs, 0o700);
await chmod(secrets, 0o700);

const caCertificate = join(certs, "ca.crt");
const caKey = join(certs, "ca.key");
if (!(await exists(caCertificate)) || !(await exists(caKey))) {
  await run("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:3072",
    "-nodes",
    "-days",
    "3650",
    "-keyout",
    caKey,
    "-out",
    caCertificate,
    "-subj",
    "/CN=Aimduck Local Development CA",
    "-addext",
    "basicConstraints=critical,CA:TRUE",
    "-addext",
    "keyUsage=critical,keyCertSign,cRLSign",
  ]);
}
if (await exists(caKey)) {
  await chmod(caKey, 0o600);
}

await createCertificate("discovery", "localhost", [
  "DNS:localhost",
  "DNS:discovery",
  "IP:127.0.0.1",
]);
for (const roomId of ["room-1", "room-2"]) {
  await createCertificate(roomId, "localhost", ["DNS:localhost", `DNS:${roomId}`, "IP:127.0.0.1"]);
  await createCertificate(`${roomId}-mtls`, roomId, []);
  const secretPath = join(secrets, `${roomId}.ticket`);
  if (!(await exists(secretPath))) {
    await writeFile(secretPath, randomBytes(32), {
      mode: 0o600,
      flag: "wx",
    });
  } else if ((await readFile(secretPath)).byteLength < 32) {
    throw new Error(`Existing room ticket secret is too short: ${secretPath}`);
  }
  await chmod(secretPath, 0o600);
}

const composeEnvironment = join(root, ".env");
if (!(await exists(composeEnvironment)) && process.getuid !== undefined) {
  await writeFile(
    composeEnvironment,
    `LOCAL_UID=${process.getuid()}\nLOCAL_GID=${process.getgid?.() ?? process.getuid()}\n`,
    { mode: 0o600, flag: "wx" },
  );
}

console.info(`Aimduck local certificates and room secrets are ready in ${root}/infra/`);

async function createCertificate(
  name: string,
  commonName: string,
  subjectAltNames: string[],
): Promise<void> {
  const certificatePath = join(certs, `${name}.crt`);
  const keyPath = join(certs, `${name}.key`);
  if ((await exists(certificatePath)) && (await exists(keyPath))) {
    await chmod(keyPath, 0o600);
    return;
  }
  const requestPath = join(certs, `${name}.csr`);
  const requestArgs = [
    "req",
    "-new",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    keyPath,
    "-out",
    requestPath,
    "-subj",
    `/CN=${commonName}`,
  ];
  if (subjectAltNames.length > 0) {
    requestArgs.push("-addext", `subjectAltName=${subjectAltNames.join(",")}`);
  }
  await run("openssl", requestArgs);
  await chmod(keyPath, 0o600);
  try {
    await run("openssl", [
      "x509",
      "-req",
      "-in",
      requestPath,
      "-CA",
      caCertificate,
      "-CAkey",
      caKey,
      "-CAcreateserial",
      "-out",
      certificatePath,
      "-days",
      "825",
      "-sha256",
      "-copy_extensions",
      "copy",
    ]);
  } finally {
    await rm(requestPath, { force: true });
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise<void>((resolvePromise, reject) => {
    execFile(command, args, { cwd: root }, (error, _stdout, stderr) => {
      if (error !== null) {
        reject(new Error(`${command} failed: ${stderr.trim()}`, { cause: error }));
        return;
      }
      resolvePromise();
    });
  });
}
