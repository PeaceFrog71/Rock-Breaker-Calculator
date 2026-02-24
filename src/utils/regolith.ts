const REGOLITH_API_URL = 'https://api.regolith.rocks';

export interface RegolithSession {
  sessionId: string;
  name: string | null;
  state: string;
  createdAt: number;           // epoch ms
  ownerScName: string | null;  // session owner's Star Citizen handle
}

export interface RegolithShipRockOre {
  ore: string;    // ShipOreEnum: 'QUANTANIUM', 'BEXALITE', 'INERTMATERIAL', etc.
  percent: number; // 0–1 scale (0.65 = 65%)
}

export interface RegolithShipRock {
  mass: number;
  res: number | null;   // 0–1 scale (0.25 = 25% resistance)
  inst: number | null;
  rockType: string | null;
  ores: RegolithShipRockOre[];
  state: string; // RockStateEnum: 'READY' | 'DEPLETED' | 'IGNORE'
}

export interface RegolithClusterFind {
  scoutingFindId: string;
  gravityWell: string | null;
  state: string; // ScoutingFindStateEnum: 'DISCOVERED' | 'READY_FOR_WORKERS' | 'WORKING' | 'DEPLETED' | 'ABANDONNED'
  clusterCount: number | null;
  score: number | null;
  rawScore: number | null;
  surveyBonus: number | null;
  createdAt: number | null;       // epoch ms from Regolith
  regolithVersion: string | null; // SC game version recorded by Regolith at scan time
  shipRocks: RegolithShipRock[];
}

async function gql<T>(apiKey: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(REGOLITH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query, ...(variables ? { variables } : {}) }),
  });

  if (!response.ok) {
    throw new Error(`Regolith API error: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || 'Regolith API returned an error');
  }

  return json.data as T;
}

/**
 * Validate a Regolith API key by fetching the user profile.
 * Returns true if the key is valid.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    await gql<{ profile: { userId: string } }>(
      apiKey,
      '{ profile { userId } }'
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch all active Regolith sessions the user participates in (owned or joined).
 * Returns sessions sorted by createdAt descending (newest first).
 * Returns empty array on error.
 */
export async function fetchActiveSessions(apiKey: string): Promise<RegolithSession[]> {
  try {
    const sessionFields = 'sessionId state name createdAt owner { scName }';
    const data = await gql<{
      profile: {
        mySessions: {
          items: Array<{
            sessionId: string;
            state: string;
            name?: string | null;
            createdAt?: number | null;
            owner?: { scName?: string | null } | null;
          }>;
        };
        joinedSessions: {
          items: Array<{
            sessionId: string;
            state: string;
            name?: string | null;
            createdAt?: number | null;
            owner?: { scName?: string | null } | null;
          }>;
        };
      };
    }>(apiKey, `{ profile { mySessions { items { ${sessionFields} } } joinedSessions { items { ${sessionFields} } } } }`);

    const owned = data.profile?.mySessions?.items ?? [];
    const joined = data.profile?.joinedSessions?.items ?? [];

    // Deduplicate by sessionId (in case a session appears in both lists)
    const seen = new Set<string>();
    const all = [...owned, ...joined].filter((s) => {
      if (seen.has(s.sessionId)) return false;
      seen.add(s.sessionId);
      return true;
    });

    return all
      .filter((s) => s.state === 'ACTIVE')
      .map((s) => ({
        sessionId: s.sessionId,
        name: s.name ?? null,
        state: s.state,
        createdAt: s.createdAt ?? 0,
        ownerScName: s.owner?.scName ?? null,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * Fetch the session ID of the user's first active Regolith session.
 * Convenience wrapper around fetchActiveSessions().
 * Returns null if no active session exists.
 */
export async function fetchActiveSessionId(apiKey: string): Promise<string | null> {
  const sessions = await fetchActiveSessions(apiKey);
  return sessions.length > 0 ? sessions[0].sessionId : null;
}

/**
 * Fetch all ShipClusterFinds (and their rocks) from a Regolith session.
 *
 * Note on scales:
 * - res: 0–1 (e.g. 0.25 = 25% resistance) — multiply by 100 before use in BreakIt
 * - inst: raw value (e.g. 25 = 25 instability)
 * - ores[].percent: 0–1 (e.g. 0.65 = 65%)
 */
export async function fetchSessionRocks(
  apiKey: string,
  sessionId: string
): Promise<RegolithClusterFind[]> {
  const query = `
    query FetchSession($sessionId: ID!) {
      session(sessionId: $sessionId) {
        scouting {
          items {
            ... on ShipClusterFind {
              scoutingFindId
              gravityWell
              state
              clusterCount
              score
              rawScore
              surveyBonus
              createdAt
              version
              shipRocks {
                mass
                res
                inst
                rockType
                state
                ores {
                  ore
                  percent
                }
              }
            }
          }
        }
      }
    }
  `;

  type SessionResponse = {
    session: {
      scouting: {
        items: Array<{
          scoutingFindId?: string;
          gravityWell?: string | null;
          state?: string;
          clusterCount?: number | null;
          score?: number | null;
          rawScore?: number | null;
          surveyBonus?: number | null;
          createdAt?: number | null;
          version?: string | null;
          shipRocks?: RegolithShipRock[];
        }>;
      } | null;
    } | null;
  };

  const data = await gql<SessionResponse>(apiKey, query, { sessionId });
  const items = data.session?.scouting?.items ?? [];

  // Filter to only active ShipClusterFinds — must have shipRocks and not be abandoned/depleted
  // Note: 'ABANDONNED' is a typo in Regolith's API (double N) but must match exactly
  const INACTIVE_FIND_STATES = new Set(['ABANDONNED', 'DEPLETED']);
  return items
    .filter((item) =>
      item.scoutingFindId !== undefined &&
      item.shipRocks !== undefined &&
      !INACTIVE_FIND_STATES.has(item.state ?? '')
    )
    .map((item) => ({
      scoutingFindId: item.scoutingFindId!,
      gravityWell: item.gravityWell ?? null,
      state: item.state ?? 'DISCOVERED',
      clusterCount: item.clusterCount ?? null,
      score: item.score ?? null,
      rawScore: item.rawScore ?? null,
      surveyBonus: item.surveyBonus ?? null,
      createdAt: item.createdAt ?? null,
      regolithVersion: item.version ?? null,
      shipRocks: item.shipRocks!,
    }));
}
