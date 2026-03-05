import type { MiningConfiguration, MiningGroup } from '../types';
import { getActiveLaserDistances, getGroupLaserDistances } from '../utils/laserHelpers';
import type { LaserDistanceInfo } from '../utils/laserHelpers';

interface OptimalDistancePanelProps {
  config?: MiningConfiguration;
  shipId?: string;
  miningGroup?: MiningGroup;
}

export default function OptimalDistancePanel({
  config,
  shipId,
  miningGroup,
}: OptimalDistancePanelProps) {
  let distances: LaserDistanceInfo[] = [];
  if (miningGroup) {
    distances = getGroupLaserDistances(miningGroup);
  } else if (config && shipId) {
    distances = getActiveLaserDistances(config, shipId);
  }

  if (distances.length === 0) return null;

  // Consolidate: if all lasers share the same range, show one line
  const uniqueRanges = new Map<string, LaserDistanceInfo[]>();
  distances.forEach((d) => {
    const key = `${d.minDistance}-${d.maxDistance}`;
    if (!uniqueRanges.has(key)) uniqueRanges.set(key, []);
    uniqueRanges.get(key)!.push(d);
  });

  return (
    <div className="optimal-distance-panel">
      <h3 className="optimal-distance-title">Optimal Distance</h3>
      <div className="optimal-distance-list">
        {uniqueRanges.size === 1 && distances.length > 1 ? (
          <div className="optimal-distance-row">
            <span className="distance-laser-name">All Lasers</span>
            <span className="distance-range">
              {distances[0].minDistance}&ndash;{distances[0].maxDistance}m
            </span>
          </div>
        ) : (
          distances.map((d, i) => (
            <div key={i} className="optimal-distance-row">
              <span className="distance-laser-name">
                {d.shipName ? `${d.shipName}: ` : ''}{d.laserName}
              </span>
              <span className="distance-range">
                {d.minDistance}&ndash;{d.maxDistance}m
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
