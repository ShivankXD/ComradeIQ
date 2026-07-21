import { afterEach, describe, expect, it, vi } from "vitest";

import { assertSameOrigin } from "../../lib/agents/session";

function requestFrom(origin: string, url = "http://localhost:3000/api/mission") {
  return new Request(url, { headers: { origin } });
}

describe("same-origin mission requests", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a loopback IP browser when Next development resolves the request as localhost", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => assertSameOrigin(requestFrom("http://127.0.0.1:3000"))).not.toThrow();
  });

  it("keeps cross-site requests blocked in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => assertSameOrigin(requestFrom("https://attacker.example"))).toThrow("This request must originate from ComradeIQ.");
  });

  it("does not relax the development exception across a port or protocol", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => assertSameOrigin(requestFrom("http://127.0.0.1:3001"))).toThrow("This request must originate from ComradeIQ.");
    expect(() => assertSameOrigin(requestFrom("https://127.0.0.1:3000"))).toThrow("This request must originate from ComradeIQ.");
  });

  it("keeps localhost and loopback IP origins distinct in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => assertSameOrigin(requestFrom("http://127.0.0.1:3000"))).toThrow("This request must originate from ComradeIQ.");
  });
});
