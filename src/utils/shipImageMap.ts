/**
 * Ship Image Configuration
 *
 * Centralizes ship image dimensions and properties.
 * The actual image imports remain in the component that uses them,
 * but this provides a single source of truth for dimensions.
 */

/**
 * Ship image configuration properties
 */
export interface ShipImageConfig {
  width: string;
  height: string;
  alt: string;
}

/**
 * Ship image configurations by ship ID for single-ship mode.
 * Dimensions are based on the pixel art assets and their desired display size.
 */
export const SHIP_IMAGE_CONFIG: Record<string, ShipImageConfig> = {
  golem: {
    width: "86.4px",
    height: "56.16px",
    alt: "GOLEM",
  },
  mole: {
    width: "120px",
    height: "78px",
    alt: "MOLE",
  },
  prospector: {
    width: "108px",
    height: "70.2px",
    alt: "Prospector",
  },
};

/**
 * Ship image configurations for mining group mode (smaller to fit multiple ships).
 */
export const SHIP_IMAGE_CONFIG_SMALL: Record<string, ShipImageConfig> = {
  golem: {
    width: "52.5px",
    height: "34.13px",
    alt: "GOLEM",
  },
  mole: {
    width: "88.58px",
    height: "57.57px",
    alt: "MOLE",
  },
  prospector: {
    width: "63.53px",
    height: "41.29px",
    alt: "Prospector",
  },
};

/**
 * Get image configuration for a ship by ID.
 * @param shipId - The ship ID
 * @param small - If true, returns smaller dimensions for multi-ship mode
 * Returns null if ship ID is not found (fallback to symbol rendering).
 */
export function getShipImageConfig(shipId: string, small = false): ShipImageConfig | null {
  const config = small ? SHIP_IMAGE_CONFIG_SMALL : SHIP_IMAGE_CONFIG;
  return config[shipId] || null;
}

/**
 * Check if a ship has a pixel art image configured.
 */
export function hasShipImage(shipId: string): boolean {
  return shipId in SHIP_IMAGE_CONFIG;
}
