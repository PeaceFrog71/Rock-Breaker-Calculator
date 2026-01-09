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
 * Ship image configurations for portrait mobile multi-ship mode.
 * Uses vw units for viewport-relative scaling.
 * Aspect ratio maintained at 1.538:1 (120:78 base).
 */
export const SHIP_IMAGE_CONFIG_PORTRAIT: Record<string, ShipImageConfig> = {
  golem: {
    width: "14vw",
    height: "9.1vw",
    alt: "GOLEM",
  },
  mole: {
    width: "24vw",
    height: "15.6vw",
    alt: "MOLE",
  },
  prospector: {
    width: "17vw",
    height: "11vw",
    alt: "Prospector",
  },
};

/**
 * Get image configuration for a ship by ID.
 * @param shipId - The ship ID
 * @param small - If true, returns smaller dimensions for multi-ship mode
 * @param portrait - If true, returns vw-based dimensions for portrait mobile
 * Returns null if ship ID is not found (fallback to symbol rendering).
 */
export function getShipImageConfig(shipId: string, small = false, portrait = false): ShipImageConfig | null {
  let config: Record<string, ShipImageConfig>;
  if (portrait) {
    config = SHIP_IMAGE_CONFIG_PORTRAIT;
  } else if (small) {
    config = SHIP_IMAGE_CONFIG_SMALL;
  } else {
    config = SHIP_IMAGE_CONFIG;
  }
  return config[shipId] || null;
}

/**
 * Check if a ship has a pixel art image configured.
 */
export function hasShipImage(shipId: string): boolean {
  return shipId in SHIP_IMAGE_CONFIG;
}
