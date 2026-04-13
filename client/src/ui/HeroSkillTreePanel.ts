import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

interface SkillNode {
  id: string;
  name: string;
  description: string;
  branch: number;
  tier: number;
  levelRequired: number;
  prerequisiteIds: string[];
  effects: Record<string, unknown>;
}

const BRANCH_COLORS = [0x4ecca3, 0x4dabf7, 0xe94560];
const BRANCH_HEX = ['#4ecca3', '#4dabf7', '#e94560'];

export class HeroSkillTreePanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private heroId: string;
  private heroRole: string;
  private onChanged: () => void;
  private tooltipContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, heroId: string, heroRole: string, onChanged: () => void) {
    this.scene = scene;
    this.heroId = heroId;
    this.heroRole = heroRole;
    this.onChanged = onChanged;
  }

  async show(): Promise<void> {
    const [tree, heroDetail] = await Promise.all([
      apiClient.getSkillTree(this.heroRole),
      apiClient.getHeroDetail(this.heroId),
    ]);

    if (!tree || !heroDetail) return;

    const unlockedSkills: string[] = heroDetail.unlockedSkills || [];
    const skillPoints: number = heroDetail.skillPoints || 0;

    // Overlay
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.8);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(300);

    this.container = this.scene.add.container(0, 0).setDepth(301);

    const panelW = 1050;
    const panelH = 580;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Title
    const roleName = this.heroRole.replace(/_/g, ' ');
    this.container.add(this.scene.add.text(px + 20, py + 12, `${heroDetail.name} - ${roleName} Skill Tree`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));

    // Skill points display
    this.container.add(this.scene.add.text(px + panelW - 200, py + 15, `Skill Points: ${skillPoints}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: skillPoints > 0 ? '#ffd700' : COLORS.textSecondary,
    }));

    // Close button
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 12, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Respec button
    const respecBtn = this.scene.add.text(px + panelW - 20, py + panelH - 25, 'Respec Skills', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textAccent,
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    respecBtn.on('pointerup', async () => {
      if (confirm('Respec all skills? Cost doubles with each respec.')) {
        try {
          const result = await apiClient.respecHeroSkills(this.heroId);
          alert(`Skills reset! Cost: ${result.cost} gold`);
          this.onChanged();
          this.hide();
          this.show();
        } catch (err) {
          alert((err as Error).message);
        }
      }
    });
    this.container.add(respecBtn);

    // Branch labels
    const branches: [string, string, string] = tree.branches;
    const branchWidth = (panelW - 60) / 3;

    for (let b = 0; b < 3; b++) {
      const bx = px + 20 + b * branchWidth + branchWidth / 2;
      this.container.add(this.scene.add.text(bx, py + 45, branches[b], {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: BRANCH_HEX[b], fontStyle: 'bold',
      }).setOrigin(0.5));
    }

    // Draw skill nodes
    const nodeSize = 50;
    const nodeGapY = 85;
    const startY = py + 75;

    const skills: SkillNode[] = tree.skills;

    for (const skill of skills) {
      const bx = px + 20 + skill.branch * branchWidth + branchWidth / 2;
      const ny = startY + skill.tier * nodeGapY;

      const isUnlocked = unlockedSkills.includes(skill.id);
      const canUnlock = !isUnlocked && skillPoints > 0 &&
        heroDetail.level >= skill.levelRequired &&
        skill.prerequisiteIds.every((p: string) => unlockedSkills.includes(p));

      // Draw connection lines to prerequisites
      for (const prereqId of skill.prerequisiteIds) {
        const prereq = skills.find((s: SkillNode) => s.id === prereqId);
        if (prereq) {
          const prereqX = px + 20 + prereq.branch * branchWidth + branchWidth / 2;
          const prereqY = startY + prereq.tier * nodeGapY + nodeSize / 2;
          const lineGfx = this.scene.add.graphics();
          lineGfx.lineStyle(2, isUnlocked ? BRANCH_COLORS[skill.branch] : 0x333355);
          lineGfx.beginPath();
          lineGfx.moveTo(prereqX, prereqY);
          lineGfx.lineTo(bx, ny - nodeSize / 2 + 5);
          lineGfx.strokePath();
          this.container.add(lineGfx);
        }
      }

      // Node background
      const nodeGfx = this.scene.add.graphics();
      if (isUnlocked) {
        nodeGfx.fillStyle(BRANCH_COLORS[skill.branch], 0.8);
      } else if (canUnlock) {
        nodeGfx.fillStyle(BRANCH_COLORS[skill.branch], 0.3);
      } else {
        nodeGfx.fillStyle(0x222244, 0.6);
      }
      nodeGfx.fillRoundedRect(bx - nodeSize / 2, ny - nodeSize / 2 + 5, nodeSize, nodeSize - 10, 6);

      if (canUnlock) {
        nodeGfx.lineStyle(2, 0xffd700);
        nodeGfx.strokeRoundedRect(bx - nodeSize / 2, ny - nodeSize / 2 + 5, nodeSize, nodeSize - 10, 6);
      } else if (isUnlocked) {
        nodeGfx.lineStyle(2, BRANCH_COLORS[skill.branch]);
        nodeGfx.strokeRoundedRect(bx - nodeSize / 2, ny - nodeSize / 2 + 5, nodeSize, nodeSize - 10, 6);
      }
      this.container.add(nodeGfx);

      // Skill name
      const nameText = this.scene.add.text(bx, ny, skill.name.length > 10 ? skill.name.substring(0, 9) + '..' : skill.name, {
        fontFamily: FONTS.primary, fontSize: '10px',
        color: isUnlocked ? '#ffffff' : canUnlock ? '#ffd700' : '#6a6a7a',
        align: 'center',
      }).setOrigin(0.5);
      this.container.add(nameText);

      // Level requirement
      this.container.add(this.scene.add.text(bx, ny + 16, `Lv${skill.levelRequired}`, {
        fontFamily: FONTS.primary, fontSize: '8px',
        color: heroDetail.level >= skill.levelRequired ? '#4ecca3' : '#e94560',
      }).setOrigin(0.5));

      // Interactive zone for tooltip + unlock
      const hitZone = this.scene.add.zone(bx, ny, nodeSize, nodeSize).setInteractive({ useHandCursor: canUnlock });
      hitZone.on('pointerover', () => this.showTooltip(bx, ny - 40, skill, isUnlocked, canUnlock));
      hitZone.on('pointerout', () => this.hideTooltip());
      hitZone.on('pointerup', async () => {
        if (canUnlock) {
          try {
            const result = await apiClient.unlockHeroSkill(this.heroId, skill.id);
            if (result.success) {
              this.onChanged();
              this.hide();
              this.show();
            } else {
              alert(result.message);
            }
          } catch (err) {
            alert((err as Error).message);
          }
        }
      });
      this.container.add(hitZone);
    }
  }

  private showTooltip(x: number, y: number, skill: SkillNode, isUnlocked: boolean, canUnlock: boolean): void {
    this.hideTooltip();
    this.tooltipContainer = this.scene.add.container(0, 0).setDepth(302);

    const tooltipW = 220;
    const tooltipH = 100;
    const tx = Math.min(x, GAME_WIDTH - tooltipW - 10);
    const ty = Math.max(y - tooltipH, 10);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a1a, 0.95);
    bg.fillRoundedRect(tx, ty, tooltipW, tooltipH, 6);
    bg.lineStyle(1, 0x4a4a6a);
    bg.strokeRoundedRect(tx, ty, tooltipW, tooltipH, 6);
    this.tooltipContainer.add(bg);

    this.tooltipContainer.add(this.scene.add.text(tx + 10, ty + 8, skill.name, {
      fontFamily: FONTS.primary, fontSize: '13px', color: '#ffd700', fontStyle: 'bold',
    }));

    this.tooltipContainer.add(this.scene.add.text(tx + 10, ty + 26, skill.description, {
      fontFamily: FONTS.primary, fontSize: '10px', color: '#c0c0d0', wordWrap: { width: tooltipW - 20 },
    }));

    const statusText = isUnlocked ? 'UNLOCKED' : canUnlock ? 'Click to unlock' : `Requires Lv ${skill.levelRequired}`;
    const statusColor = isUnlocked ? '#4ecca3' : canUnlock ? '#ffd700' : '#e94560';
    this.tooltipContainer.add(this.scene.add.text(tx + 10, ty + tooltipH - 20, statusText, {
      fontFamily: FONTS.primary, fontSize: '10px', color: statusColor,
    }));
  }

  private hideTooltip(): void {
    this.tooltipContainer?.destroy(true);
    this.tooltipContainer = null;
  }

  hide(): void {
    this.hideTooltip();
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
