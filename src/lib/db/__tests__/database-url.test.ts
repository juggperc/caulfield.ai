import { describe, expect, it } from "vitest";
import {
  urlRequiresPrepareDisabled,
} from "../database-url";

describe("urlRequiresPrepareDisabled", () => {
  it("detects Supabase transaction pooler port", () => {
    expect(
      urlRequiresPrepareDisabled(
        "postgres://u:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      ),
    ).toBe(true);
  });

  it("allows direct-style host without pooler hints", () => {
    expect(
      urlRequiresPrepareDisabled(
        "postgres://u:p@db.abcdefgh.supabase.co:5432/postgres",
      ),
    ).toBe(false);
  });
});
