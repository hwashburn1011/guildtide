import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config';
import { BootScene } from './scenes/BootScene';
import { LoginScene } from './scenes/LoginScene';
import { RegionSelectScene } from './scenes/RegionSelectScene';
import { GuildHallScene } from './scenes/GuildHallScene';
import { ExpeditionScene } from './scenes/ExpeditionScene';
import { MarketScene } from './scenes/MarketScene';
import { ResearchScene } from './scenes/ResearchScene';
import { WorldMapScene } from './scenes/WorldMapScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, LoginScene, RegionSelectScene, GuildHallScene, ExpeditionScene, MarketScene, ResearchScene, WorldMapScene],
};

new Phaser.Game(config);
