import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { BUILDING_DEFINITIONS } from '@shared/constants';
import { BuildingType, ResourceType } from '@shared/enums';

export type BuildingSortKey = 'name' | 'cost' | 'level' | 'output';
export type BuildingFilterKey = 'all' | 'resource' | 'special' | 'unlocked' | 'locked';

/**
 * Filter and sort utilities for the building menu.
 */
export class BuildingFilterSort {
  /**
   * Sort building types by the given key.
   */
  static sort(types: BuildingType[], sortBy: BuildingSortKey): BuildingType[] {
    const sorted = [...types];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => {
          const defA = BUILDING_DEFINITIONS[a];
          const defB = BUILDING_DEFINITIONS[b];
          return (defA?.name ?? '').localeCompare(defB?.name ?? '');
        });
        break;
      case 'cost':
        sorted.sort((a, b) => {
          const costA = BuildingFilterSort.totalBaseCost(a);
          const costB = BuildingFilterSort.totalBaseCost(b);
          return costA - costB;
        });
        break;
      case 'output':
        sorted.sort((a, b) => {
          const outA = BuildingFilterSort.totalBaseOutput(a);
          const outB = BuildingFilterSort.totalBaseOutput(b);
          return outB - outA;
        });
        break;
      default:
        break;
    }
    return sorted;
  }

  /**
   * Filter building types by category.
   */
  static filter(
    types: BuildingType[],
    filterBy: BuildingFilterKey,
    unlockedSet: Set<BuildingType>,
  ): BuildingType[] {
    switch (filterBy) {
      case 'resource':
        return types.filter(t => {
          const def = BUILDING_DEFINITIONS[t];
          return def && Object.keys(def.baseOutput).length > 0;
        });
      case 'special':
        return types.filter(t => {
          const def = BUILDING_DEFINITIONS[t];
          return def && Object.keys(def.baseOutput).length === 0;
        });
      case 'unlocked':
        return types.filter(t => unlockedSet.has(t));
      case 'locked':
        return types.filter(t => !unlockedSet.has(t));
      default:
        return types;
    }
  }

  private static totalBaseCost(type: BuildingType): number {
    const def = BUILDING_DEFINITIONS[type];
    if (!def) return 0;
    return Object.values(def.baseCost).reduce((sum, v) => sum + (v as number), 0);
  }

  private static totalBaseOutput(type: BuildingType): number {
    const def = BUILDING_DEFINITIONS[type];
    if (!def) return 0;
    return Object.values(def.baseOutput).reduce((sum, v) => sum + (v as number), 0);
  }
}
