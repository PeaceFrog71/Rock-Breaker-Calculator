const REGOLITH_API_URL = 'https://api.regolith.rocks';

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

async function gql<T>(apiKey: string, query: string): Promise<T> {
  const response = await fetch(REGOLITH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query }),
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
 * Fetch the session ID of the user's active Regolith session.
 * Uses profile.mySessions to find the first ACTIVE session.
 * Returns null if no active session exists.
 */
export async function fetchActiveSessionId(apiKey: string): Promise<string | null> {
  try {
    const data = await gql<{
      profile: {
        mySessions: {
          items: Array<{ sessionId: string; state: string }>;
        };
      };
    }>(apiKey, '{ profile { mySessions { items { sessionId state } } } }');

    const sessions = data.profile?.mySessions?.items ?? [];
    return sessions.find((s) => s.state === 'ACTIVE')?.sessionId ?? null;
  } catch {
    return null;
  }
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
  const query = `{
    session(sessionId: "${sessionId}") {
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
  }`;

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

  const data = await gql<SessionResponse>(apiKey, query);
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
