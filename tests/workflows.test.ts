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

  it("ci.yml grants pull-requests: read for the PR title check", () => {
    const ci = parse(read(".github/workflows/ci.yml")) as Workflow & {
      permissions: { contents?: string; "pull-requests"?: string };
    };
    expect(ci.permissions).toEqual({ contents: "read", "pull-requests": "read" });
  });

  it("all workflows pin Node 24 (dev parity, bundles npm 11)", () => {
    type Step = { uses?: string; with?: { "node-version"?: string } };
    type Wf = { jobs: Record<string, { steps: Step[] }> };
    for (const f of ["ci.yml", "release.yml"]) {
      const wf = parse(read(`.github/workflows/${f}`)) as Wf;
      for (const job of Object.values(wf.jobs)) {
        for (const step of job.steps) {
          if (step.uses?.startsWith("actions/setup-node")) {
            expect(step.with?.["node-version"]).toBe("24");
          }
        }
      }
    }
  });

  it("release.yml avoids persisting checkout credentials", () => {
    const release = parse(read(".github/workflows/release.yml")) as Workflow;
    const text = JSON.stringify(release.jobs.release.steps);
    expect(text).toContain("persist-credentials");
    expect(text).toContain("false");
  });

  it("package.json defines a name required by semantic-release", () => {
    const pkg = JSON.parse(read("package.json")) as { name?: string };
    expect(typeof pkg.name).toBe("string");
    expect(pkg.name?.length).toBeGreaterThan(0);
  });

  it("release.yml grants issues: write for release annotations", () => {
    const release = parse(read(".github/workflows/release.yml")) as Workflow & {
      permissions: { contents?: string; issues?: string };
    };
    expect(release.permissions?.issues).toBe("write");
  });
});
