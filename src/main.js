import Phaser from 'phaser';
import { GAME_W, GAME_H, PALETTE } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import StageSelectScene from './scenes/StageSelectScene.js';
import StageEditorScene from './scenes/StageEditorScene.js';
import ShopScene from './scenes/ShopScene.js';
import GameScene from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    parent: 'game-container',
    backgroundColor: PALETTE.bg,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, TitleScene, MainMenuScene, StageSelectScene, StageEditorScene, ShopScene, GameScene],
};

const game = new Phaser.Game(config);
