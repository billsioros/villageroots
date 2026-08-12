import { describe, it, expect } from "vitest";
import { shouldMaskLivingOnRead, maskPrivateLiving } from "@/lib/graph/policy";

const livingPrivateNode = {
  type: "person",
  privacy: "private" as const,
  properties: { deceased: false, x: 10, y: 20, phone: "123" },
  createdBy: "owner",
};

describe("shouldMaskLivingOnRead", () => {
  it("masks a living private person from an anonymous reader", () => {
    expect(
      shouldMaskLivingOnRead(livingPrivateNode, { uid: null, isAdmin: false }),
    ).toBe(true);
  });

  it("masks a living private person from a non-owner, non-admin reader", () => {
    expect(
      shouldMaskLivingOnRead(livingPrivateNode, { uid: "other", isAdmin: false }),
    ).toBe(true);
  });

  it("does not mask the owner viewing their own node", () => {
    expect(
      shouldMaskLivingOnRead(livingPrivateNode, { uid: "owner", isAdmin: false }),
    ).toBe(false);
  });

  it("does not mask for an admin", () => {
    expect(
      shouldMaskLivingOnRead(livingPrivateNode, { uid: "owner", isAdmin: true }),
    ).toBe(false);
  });

  it("does not mask a deceased person node (historical, public)", () => {
    expect(
      shouldMaskLivingOnRead(
        { ...livingPrivateNode, properties: { deceased: true } },
        { uid: null, isAdmin: false },
      ),
    ).toBe(false);
  });

  it("does not mask a non-person node", () => {
    expect(
      shouldMaskLivingOnRead(
        { ...livingPrivateNode, type: "landmark" },
        { uid: null, isAdmin: false },
      ),
    ).toBe(false);
  });

  it("does not mask a public person node (admin deliberately published)", () => {
    expect(
      shouldMaskLivingOnRead(
        { ...livingPrivateNode, privacy: "public" },
        { uid: null, isAdmin: false },
      ),
    ).toBe(false);
  });
});

describe("maskPrivateLiving", () => {
  it("blanks PII while preserving node identity and structural fields", () => {
    const out = maskPrivateLiving({
      id: "n1",
      slug: "n1",
      type: "person",
      privacy: "private",
      status: "approved",
      label: "Real Name",
      subtitle: "village bio",
      description: "family story",
      properties: { deceased: false, x: 10, y: 20, phone: "123" },
      createdBy: "owner",
      createdAt: "t",
      updatedAt: "t",
    });

    expect(out.label).toBe("Living Person");
    expect(out.subtitle).toBe("");
    expect(out.description).toBe("");
    expect(out.properties).toEqual({ x: 10, y: 20 });
    expect(out.id).toBe("n1");
    expect(out.slug).toBe("n1");
    expect(out.type).toBe("person");
    expect(out.privacy).toBe("private");
    expect(out.status).toBe("approved");
    expect(out.createdBy).toBe("owner");
  });
});
