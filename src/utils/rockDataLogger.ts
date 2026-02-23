import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getGameVersion } from './gameVersion';
import type { RegolithClusterFind, RegolithShipRock } from './regolith';
import type { User } from '@supabase/supabase-js';

interface LogRockImportParams {
  find: RegolithClusterFind;
  rock: RegolithShipRock;
  rockIndex: number;
  sessionId: string;
  user: User | null;
}

/**
 * Log a Regolith rock import to Supabase for global analytics.
 * Fire-and-forget — never throws, never blocks the import UX.
 *
 * Records:
 * - Full rock stats (mass, resistance, instability, rock type, ores)
 * - Find context (gravity well, cluster count, Regolith score, survey bonus)
 * - Both game versions: sc_version (from starcitizen-api.com cache) and
 *   regolith_version (the version field Regolith recorded at scan time)
 * - User attribution (nullable — anonymous imports are still recorded)
 */
export async function logRockImport({
  find,
  rock,
  rockIndex,
  sessionId,
  user,
}: LogRockImportParams): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const scVersion = await getGameVersion();

    const { data: importRow, error } = await (supabase as any)
      .from('regolith_rock_imports')
      .insert({
        breaker_user_id:     user?.id ?? null,
        scouting_find_id:    find.scoutingFindId,
        regolith_session_id: sessionId,
        rock_index:          rockIndex,
        gravity_well:        find.gravityWell,
        rock_type:           rock.rockType,
        mass:                rock.mass,
        resistance:          rock.res,           // stored as 0–1 (Regolith native scale)
        instability:         rock.inst,
        find_state:          find.state,
        rock_state:          rock.state,
        cluster_count:       find.clusterCount,
        score:               find.score,
        raw_score:           find.rawScore,
        survey_bonus:        find.surveyBonus,
        regolith_version:    find.regolithVersion,
        sc_version:          scVersion,
        find_created_at:     find.createdAt
          ? new Date(find.createdAt).toISOString()
          : null,
      })
      .select('id')
      .single();

    if (error || !importRow) return;

    if (rock.ores.length > 0) {
      await (supabase as any)
        .from('regolith_rock_ores')
        .insert(
          rock.ores.map((ore) => ({
            rock_import_id: importRow.id,
            ore:            ore.ore,
            percent:        ore.percent, // stored as 0–1 (Regolith native scale)
          }))
        );
    }
  } catch {
    // Never surface logging errors to the user
  }
}
