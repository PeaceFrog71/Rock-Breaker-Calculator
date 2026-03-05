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

  // Deduplicate by laser name — same laser type only shown once
  const seen = new Set<string>();
  const uniqueDistances = distances.filter((d) => {
    if (seen.has(d.laserName)) return false;
    seen.add(d.laserName);
    return true;
  });

  return (
    <div className="optimal-distance-panel">
      <h3 className="optimal-distance-title">Mining Laser Distances <span className="distance-unit">(m)</span></h3>
      <table className="optimal-distance-table">
        <thead>
          <tr>
            <th scope="col" className="distance-col-label">Laser</th>
            <th scope="col" className="distance-col-value">OPTIMAL</th>
            <th scope="col" className="distance-col-value">MAX</th>
          </tr>
        </thead>
        <tbody>
          {uniqueDistances.map((d, i) => (
            <tr key={d.laserName}>
              <td className="distance-col-label">{d.laserName}</td>
              <td className="distance-col-value distance-optimal">{d.optimalDistance}</td>
              <td className="distance-col-value">{d.maxDistance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
