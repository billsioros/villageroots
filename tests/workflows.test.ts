import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

type Job = { steps: Array<{ run?: string }>; "runs-on"?: string };
type Workflow = { jobs: Record<string, Job>; permissions?: { contents?: string } };

describe("CI/CD configuration", () => {
  it("commitlint enforces conventional commits", () => {
    const cfg = read("commitlint.config.mjs");
    expect(cfg).toContain("@commitlint/config-conventional");
  });

  it(".releaserc.json does not publish to a registry", () => {
    const rc = JSON.parse(read(".releaserc.json")) as {
      plugins: unknown[];
    };
    const npmPlugin = rc.plugins.find(
      (p: unknown) => Array.isArray(p) && (p as unknown[])[0] === "@semantic-release/npm",
    );
    expect(npmPlugin).toBeDefined();
    expect((npmPlugin as unknown[])[1]).toEqual({ npmPublish: false });
  });

  it("renovate.json uses the recommended preset", () => {
    const rn = JSON.parse(read("renovate.json"));
    expect(rn.extends).toContain("config:recommended");
  });

  it("ci.yml defines commitlint, pr-title, and quality jobs", () => {
    const ci = parse(read(".github/workflows/ci.yml")) as Workflow;
    expect(Object.keys(ci.jobs)).toEqual(
      expect.arrayContaining(["commitlint", "pr-title", "quality"]),
    );
    expect(ci.jobs.quality["runs-on"]).toBe("ubuntu-latest");
  });

  it("ci.yml quality job runs lint, test, and build", () => {
    const ci = parse(read(".github/workflows/ci.yml")) as Workflow;
    const runs = ci.jobs.quality.steps.map((s) => s.run ?? "").join("\n");
    expect(runs).toContain("npm run lint");
    expect(runs).toContain("npm test");
    expect(runs).toContain("npm run build");
  });

  it("release.yml runs semantic-release with contents: write", () => {
    const release = parse(read(".github/workflows/release.yml")) as Workflow;
    expect(release.permissions?.contents).toBe("write");
    const runs = release.jobs.release.steps.map((s) => s.run ?? "").join("\n");
    expect(runs).toContain("semantic-release");
  });
});
