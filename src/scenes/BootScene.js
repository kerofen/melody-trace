import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import GameData from '../managers/GameData.js';
import AdManager from '../managers/AdManager.js';
import SoundManager from '../managers/SoundManager.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(GAME_W / 2 - 160, GAME_H / 2 - 25, 320, 50);

        const loadingText = this.add.text(GAME_W / 2, GAME_H / 2 - 50, 'Loading...', {
            fontSize: '20px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x4d96ff, 1);
            progressBar.fillRect(GAME_W / 2 - 150, GAME_H / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        this.loadFont('KeiFont', 'assets/k-font/keifont.ttf');
    }

    loadFont(name, url) {
        const newFont = new FontFace(name, `url(${url})`);
        newFont.load().then((loaded) => {
            document.fonts.add(loaded);
        }).catch((error) => {
            console.warn('Font loading failed:', error);
        });
    }

    create() {
        GameData.load();
        AdManager.initialize();
        SoundManager.init();

        this.time.delayedCall(500, () => {
            this.scene.start('TitleScene');
        });
    }
}
