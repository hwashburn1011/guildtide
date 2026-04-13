/**
 * Extended hero name generation system.
 * T-0461: Name generation influenced by real-world cultural calendar
 * T-0465: Hero genealogy tree for retired heroes' successors
 * T-0373: Fantasy first and last name banks (extended)
 */

// Seasonal name pools — names inspired by the season when recruited
const SEASONAL_FIRST_NAMES: Record<string, string[]> = {
  spring: ['Flora', 'Vernal', 'Bloom', 'Raindrop', 'Sprout', 'Meadow', 'Dawn', 'Lark', 'Fern', 'Petal'],
  summer: ['Sol', 'Blaze', 'Ember', 'Torch', 'Sear', 'Haze', 'Flare', 'Solstice', 'August', 'Ray'],
  autumn: ['Harvest', 'Auburn', 'Maple', 'Raven', 'Thorn', 'Cinder', 'Russet', 'Hazel', 'Storm', 'Crow'],
  winter: ['Frost', 'Nieve', 'Glacier', 'Drift', 'Crystal', 'Vale', 'Shadow', 'Pale', 'Glacia', 'Boreal'],
};

// Month-influenced middle names
const MONTH_NAMES: Record<number, string[]> = {
  0: ['Newborn', 'First'],           // January
  1: ['Valentine', 'Heart'],         // February
  2: ['March', 'Equinox'],           // March
  3: ['Rain', 'Blossom'],            // April
  4: ['May', 'Green'],               // May
  5: ['Midsummer', 'Sunlight'],      // June
  6: ['Thunder', 'Heat'],            // July
  7: ['Harvest', 'Golden'],          // August
  8: ['Autumn', 'Twilight'],         // September
  9: ['Hunter', 'Moon'],             // October
  10: ['Frost', 'Shadow'],           // November
  11: ['Winter', 'Star'],            // December
};

// Day-of-week titles
const DAY_TITLES: Record<number, string> = {
  0: 'the Sunlit',
  1: 'the Moon-touched',
  2: 'the Warbound',
  3: 'the Wise',
  4: 'the Thunderborn',
  5: 'the Fortunate',
  6: 'the Stargazer',
};

export function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/**
 * Generate a name influenced by the current date.
 * Has a 30% chance to use seasonal/calendar-influenced naming.
 */
export function generateCalendarName(baseName: string): string {
  if (Math.random() > 0.3) return baseName; // 70% use standard names

  const season = getCurrentSeason();
  const month = new Date().getMonth();
  const day = new Date().getDay();

  const seasonalNames = SEASONAL_FIRST_NAMES[season] || SEASONAL_FIRST_NAMES.spring;
  const firstName = seasonalNames[Math.floor(Math.random() * seasonalNames.length)];
  const lastName = baseName.split(' ')[1] || baseName;

  // Occasionally add a title
  if (Math.random() < 0.2) {
    const title = DAY_TITLES[day] || '';
    return `${firstName} ${lastName} ${title}`.trim();
  }

  return `${firstName} ${lastName}`;
}

/**
 * Hero genealogy system — track lineage of retired heroes' successors.
 */
export interface GenealogyNode {
  heroId: string;
  heroName: string;
  heroRole: string;
  level: number;
  parentId: string | null;     // the retired hero this one "descends" from
  retiredAt: string | null;
  children: string[];          // IDs of heroes inspired by this one
}

export interface GenealogyTree {
  roots: GenealogyNode[];      // heroes with no parent (original recruits)
  nodes: Record<string, GenealogyNode>;
}

/**
 * Build genealogy tree from guild metadata.
 */
export function buildGenealogyTree(
  retiredHeroes: Array<{ id: string; name: string; role: string; level: number; retiredAt: string }>,
  activeHeroes: Array<{ id: string; name: string; role: string; level: number; metadata?: any }>,
): GenealogyTree {
  const nodes: Record<string, GenealogyNode> = {};
  const roots: GenealogyNode[] = [];

  // Add retired heroes as potential parents
  for (const hero of retiredHeroes) {
    nodes[hero.id] = {
      heroId: hero.id,
      heroName: hero.name,
      heroRole: hero.role,
      level: hero.level,
      parentId: null,
      retiredAt: hero.retiredAt,
      children: [],
    };
    roots.push(nodes[hero.id]);
  }

  // Add active heroes, linking to their "parent" if they have one
  for (const hero of activeHeroes) {
    const meta = hero.metadata || {};
    const parentId = meta.inspiredBy || null;

    nodes[hero.id] = {
      heroId: hero.id,
      heroName: hero.name,
      heroRole: hero.role,
      level: hero.level,
      parentId,
      retiredAt: null,
      children: [],
    };

    if (parentId && nodes[parentId]) {
      nodes[parentId].children.push(hero.id);
    } else if (!parentId) {
      roots.push(nodes[hero.id]);
    }
  }

  return { roots, nodes };
}
