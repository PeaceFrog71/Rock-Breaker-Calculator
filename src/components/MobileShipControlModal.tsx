import type { ShipInstance, MiningConfiguration, Module, Rock } from '../types';
import './MobileShipControlModal.css';

interface MobileShipControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Ship data - for single ship mode, we create a pseudo-ShipInstance
  shipInstance?: ShipInstance;
  // For single ship mode without a ShipInstance
  singleShipConfig?: MiningConfiguration;
  shipName?: string;
  shipId?: string;
  // Mode
  isSingleShipMode: boolean;
  // Rock data for scanning laser selection
  rock?: Rock;
  // Handlers
  onToggleShip?: (shipId: string) => void; // Group mode only
  onToggleLaser: (shipIdOrLaserIndex: string | number, laserIndex?: number) => void;
  onToggleModule: (shipIdOrLaserIndex: string | number, laserIndexOrModuleIndex: number, moduleIndex?: number) => void;
  onSetScanningShip?: (shipId: string, laserIndex: number) => void;
}

export default function MobileShipControlModal({
  isOpen,
  onClose,
  shipInstance,
  singleShipConfig,
  shipName,
  shipId,
  isSingleShipMode,
  rock,
  onToggleShip,
  onToggleLaser,
  onToggleModule,
  onSetScanningShip,
}: MobileShipControlModalProps) {
  if (!isOpen) return null;

  // Get the config and ship info
  const config = isSingleShipMode ? singleShipConfig : shipInstance?.config;
  const displayName = isSingleShipMode ? (shipName || 'Ship') : (shipInstance?.name || 'Ship');
  const currentShipId = isSingleShipMode ? (shipId || '') : (shipInstance?.id || '');
  const isMole = isSingleShipMode ? (shipId === 'mole') : (shipInstance?.ship.id === 'mole');
  const isActive = shipInstance?.isActive !== false;

  if (!config) return null;

  // Get module symbol for display
  const getModuleSymbol = (moduleId: string) => {
    if (moduleId === "stampede") return "St";
    return moduleId.charAt(0).toUpperCase();
  };

  // Get active modules for a specific laser
  const getActiveModulesForLaser = (laserIndex: number) => {
    const laser = config.lasers[laserIndex];
    if (!laser) return [];

    const modules: { moduleIndex: number; module: Module; isActive: boolean }[] = [];
    laser.modules.forEach((module, moduleIndex) => {
      if (module && module.category === 'active') {
        const isModuleActive = laser.moduleActive ? laser.moduleActive[moduleIndex] === true : false;
        modules.push({ moduleIndex, module, isActive: isModuleActive });
      }
    });
    return modules;
  };

  // Check if there are any active modules across all lasers
  const hasAnyActiveModules = config.lasers.some(laser =>
    laser.modules.some(module => module && module.category === 'active')
  );

  const handleToggleLaser = (laserIndex: number) => {
    if (isSingleShipMode) {
      onToggleLaser(laserIndex);
    } else {
      onToggleLaser(currentShipId, laserIndex);
    }
  };

  const handleToggleModule = (laserIndex: number, moduleIndex: number) => {
    if (isSingleShipMode) {
      onToggleModule(laserIndex, moduleIndex);
    } else {
      onToggleModule(currentShipId, laserIndex, moduleIndex);
    }
  };

  const handleToggleShip = () => {
    if (!isSingleShipMode && onToggleShip) {
      onToggleShip(currentShipId);
    }
  };

  return (
    <div className="mobile-modal-overlay" onClick={onClose}>
      <div className="mobile-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-modal-header">
          <h3>{displayName}</h3>
          <button className="mobile-close-button" onClick={onClose} title="Close">×</button>
        </div>

        <div className="mobile-modal-body">
          {/* Ship Activation Toggle - Group mode only */}
          {!isSingleShipMode && onToggleShip && (
            <div className="mobile-control-section">
              <div className="mobile-control-label">Ship Status</div>
              <button
                className={`mobile-toggle-button ${isActive ? 'active' : 'inactive'}`}
                onClick={handleToggleShip}
              >
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </button>
            </div>
          )}

          {/* MOLE: Combined Laser Manning + Modules per laser */}
          {isMole && (
            <div className="mobile-control-section">
              <div className="mobile-control-label">Lasers & Modules</div>
              <div className="mobile-laser-rows">
                {config.lasers.map((laser, laserIndex) => {
                  const isManned = laser.isManned !== false;
                  const laserModules = getActiveModulesForLaser(laserIndex);

                  return (
                    <div key={laserIndex} className="mobile-laser-row">
                      {/* Row 1: Laser label + Manned button */}
                      <div className="mobile-laser-manned-row">
                        <span className="mobile-laser-label">L{laserIndex + 1}</span>
                        <button
                          className={`mobile-toggle-button manned ${isManned ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleLaser(laserIndex)}
                        >
                          {isManned ? 'MANNED' : 'OFF'}
                        </button>
                      </div>
                      {/* Row 2: Module chips */}
                      {laserModules.length > 0 && (
                        <div className="mobile-laser-modules">
                          {laserModules.map((item) => (
                            <button
                              key={item.moduleIndex}
                              className={`mobile-module-chip ${item.isActive ? 'active' : 'inactive'}`}
                              onClick={() => handleToggleModule(laserIndex, item.moduleIndex)}
                              title={`${item.module.name} - ${item.isActive ? 'ON' : 'OFF'}`}
                            >
                              {getModuleSymbol(item.module.id)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Non-MOLE: Just show active modules if any */}
          {!isMole && hasAnyActiveModules && (
            <div className="mobile-control-section">
              <div className="mobile-control-label">Active Modules</div>
              <div className="mobile-laser-modules">
                {getActiveModulesForLaser(0).map((item) => (
                  <button
                    key={item.moduleIndex}
                    className={`mobile-module-chip ${item.isActive ? 'active' : 'inactive'}`}
                    onClick={() => handleToggleModule(0, item.moduleIndex)}
                    title={`${item.module.name} - ${item.isActive ? 'ON' : 'OFF'}`}
                  >
                    {getModuleSymbol(item.module.id)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scanning Laser Selector - MOLE only, Modified resistance mode only */}
          {isMole && rock?.resistanceMode === 'modified' && onSetScanningShip && (
            <div className="mobile-control-section">
              <div className="mobile-control-label">Scanning Laser</div>
              <div className="mobile-scanning-lasers">
                {config.lasers.map((laser, laserIndex) => {
                  const isSelected = rock.scannedByShipId === currentShipId && rock.scannedByLaserIndex === laserIndex;
                  const hasLaser = laser.laserHead && laser.laserHead.id !== 'none';
                  return (
                    <button
                      key={laserIndex}
                      className={`mobile-scanning-button ${isSelected ? 'selected' : ''} ${!hasLaser ? 'disabled' : ''}`}
                      onClick={() => hasLaser && onSetScanningShip(currentShipId, laserIndex)}
                      disabled={!hasLaser}
                    >
                      L{laserIndex + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scanning Laser Selector - Prospector/GOLEM (single-laser ships) */}
          {!isMole && rock?.resistanceMode === 'modified' && onSetScanningShip && (
            (() => {
              const laser = config.lasers[0];
              const hasLaser = laser?.laserHead && laser.laserHead.id !== 'none';
              const isSelected = rock.scannedByShipId === currentShipId && rock.scannedByLaserIndex === 0;

              if (!hasLaser) return null;

              return (
                <div className="mobile-control-section">
                  <div className="mobile-control-label">Scanning Ship</div>
                  <button
                    className={`mobile-scanning-button single-laser ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSetScanningShip(currentShipId, 0)}
                  >
                    📡 {isSelected ? 'THIS SHIP SCANNED' : 'MARK AS SCANNER'}
                  </button>
                </div>
              );
            })()
          )}

          {/* No controls message */}
          {!isMole && !hasAnyActiveModules && isSingleShipMode && (
            <div className="mobile-no-controls">
              No active modules equipped
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
