// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

type ComposeConfiguration = {
  services: Record<
    string,
    {
      ports?: Array<{ host_ip?: string; published?: string }>;
      volumes?: Array<{ target?: string }>;
      healthcheck?: { test?: string[] };
    }
  >;
};

describe("local Compose topology", () => {
  it("defines healthy loopback-only services without mounting the Docker socket", () => {
    const result = spawnSync("docker", ["compose", "config", "--format", "json"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    if (result.error !== undefined) {
      throw new Error("Docker Compose is required for the topology smoke test.", {
        cause: result.error,
      });
    }
    expect(result.status, result.stderr).toBe(0);
    const configuration = JSON.parse(result.stdout) as ComposeConfiguration;
    expect(Object.keys(configuration.services)).toEqual(
      expect.arrayContaining(["idp", "client", "discovery", "room-1", "room-2"]),
    );
    for (const service of Object.values(configuration.services)) {
      expect(service.healthcheck?.test).toBeDefined();
      for (const port of service.ports ?? []) {
        expect(port.host_ip).toBe("127.0.0.1");
      }
    }
    expect(JSON.stringify(configuration)).not.toContain("/var/run/docker.sock");
  });
});
