/**
 * Static class managing depth layers for consistent z-index ordering.
 * Use these constants when setting depth on Phaser game objects.
 */
export class UIZIndexManager {
  static readonly BACKGROUND = 0;
  static readonly CONTENT = 10;
  static readonly OVERLAY = 100;
  static readonly MODAL = 200;
  static readonly TOOLTIP = 300;
  static readonly NOTIFICATION = 400;

  /**
   * Get depth value for a named layer.
   */
  static getDepth(layer: keyof typeof UIZIndexManager.LAYERS): number {
    return UIZIndexManager.LAYERS[layer];
  }

  /**
   * All layers as a lookup table.
   */
  static readonly LAYERS = {
    background: UIZIndexManager.BACKGROUND,
    content: UIZIndexManager.CONTENT,
    overlay: UIZIndexManager.OVERLAY,
    modal: UIZIndexManager.MODAL,
    tooltip: UIZIndexManager.TOOLTIP,
    notification: UIZIndexManager.NOTIFICATION,
  } as const;

  /**
   * Apply depth to a Phaser game object based on layer name.
   */
  static applyDepth(
    target: { setDepth: (depth: number) => void },
    layer: keyof typeof UIZIndexManager.LAYERS,
    offset: number = 0,
  ): void {
    target.setDepth(UIZIndexManager.LAYERS[layer] + offset);
  }
}
