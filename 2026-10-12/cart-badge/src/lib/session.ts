export interface Session {
  name: string;
  cartCount: number;
}

const SESSIONS: Record<string, Session> = {
  abc: { name: "Ada", cartCount: 2 },
  xyz: { name: "Grace", cartCount: 0 },
};

export async function getSession(
  sid: string | undefined,
): Promise<Session | null> {
  await new Promise((r) => setTimeout(r, 400)); // simulate a slow lookup
  return sid ? (SESSIONS[sid] ?? null) : null;
}
