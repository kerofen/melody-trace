import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_STYLE, NOTE_COLORS } from '../config.js';
import SoundManager from '../managers/SoundManager.js';

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        this.transitioning = false;
        this.noteObjects = [];

        this.createBackground();
        this.createLogo();
        this.createNoteAnimation();
        this.createTapPrompt();

        this.input.once('pointerup', () => {
            this.goToMainMenu();
        });

        this.cameras.main.fadeIn(400);
    }

    createBackground() {
        const bgGraphics = this.add.graphics();
        bgGraphics.setDepth(-10);
        const steps = 20;
        for (let i = 0; i < steps; i++) {
            const ratio = i / steps;
            const r = Math.floor(26 + ratio * 10);
            const g = Math.floor(26 - ratio * 10);
            const b = Math.floor(46 + ratio * 30);
            const color = (r << 16) | (g << 8) | b;
            bgGraphics.fillStyle(color, 1);
            bgGraphics.fillRect(0, (GAME_H / steps) * i, GAME_W, GAME_H / steps + 1);
        }

        const colors = Object.values(NOTE_COLORS);
        for (let i = 0; i < 10; i++) {
            const x = Phaser.Math.Between(20, GAME_W - 20);
            const y = Phaser.Math.Between(80, GAME_H - 100);
            const circle = this.add.circle(x, y, Phaser.Math.Between(15, 45), colors[i % colors.length], 0.12);
            circle.setDepth(-9);
            this.tweens.add({
                targets: circle,
                y: y + Phaser.Math.Between(-25, 25),
                duration: Phaser.Math.Between(2500, 4500),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
        }
    }

    createLogo() {
        const logoY = GAME_H * 0.35;

        this.titleText = this.add.text(GAME_W / 2, logoY, 'メロディートレース', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '38px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6,
        }).setOrigin(0.5);

        this.titleText.setAlpha(0);
        this.titleText.setY(logoY + 30);
        this.tweens.add({
            targets: this.titleText,
            alpha: 1,
            y: logoY,
            duration: 600,
            ease: 'Cubic.easeOut',
            delay: 200,
        });

        const subtitle = this.add.text(GAME_W / 2, logoY + 50, '音階パズル', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        subtitle.setAlpha(0);
        this.tweens.add({
            targets: subtitle,
            alpha: 1,
            duration: 500,
            delay: 600,
        });
    }

    createNoteAnimation() {
        const noteSymbols = ['♪', '♫', '♬', '♩', '♪'];
        const colors = ['#ff6b6b', '#ffd93d', '#4d96ff', '#6bcb77', '#a855f7'];

        for (let i = 0; i < 5; i++) {
            const x = GAME_W * 0.15 + (i * GAME_W * 0.175);
            const y = GAME_H * 0.55;

            const note = this.add.text(x, y, noteSymbols[i], {
                fontSize: '32px',
                color: colors[i],
            }).setOrigin(0.5);
            note.setAlpha(0);
            this.noteObjects.push(note);

            this.tweens.add({
                targets: note,
                alpha: 0.7,
                duration: 400,
                delay: 800 + i * 120,
            });

            this.tweens.add({
                targets: note,
                y: y - 18,
                duration: 600,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: 800 + i * 120,
            });
        }
    }

    createTapPrompt() {
        this.tapPrompt = this.add.text(GAME_W / 2, GAME_H * 0.78, 'タップしてはじめる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        this.tapPrompt.setAlpha(0);

        this.tweens.add({
            targets: this.tapPrompt,
            alpha: 1,
            duration: 500,
            delay: 1200,
            onComplete: () => {
                this.tweens.add({
                    targets: this.tapPrompt,
                    alpha: 0.5,
                    duration: 800,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1,
                });
            },
        });
    }

    goToMainMenu() {
        if (this.transitioning) return;
        this.transitioning = true;

        // 桜井イズム：タップ時に即座にフィードバックを返す
        SoundManager.playDecideSE();
        SoundManager.triggerHaptic(15);

        // ロゴのバウンス演出
        this.tweens.add({
            targets: this.titleText,
            scale: 1.08,
            duration: 80,
            yoyo: true,
            ease: 'Quad.easeOut',
        });

        // タップ促しを消す
        this.tweens.add({
            targets: this.tapPrompt,
            alpha: 0,
            duration: 150,
        });

        // 音符が散るトランジション
        this.noteObjects.forEach((note, i) => {
            const angle = Phaser.Math.Between(-60, 60) * Math.PI / 180;
            const speed = Phaser.Math.Between(200, 400);
            this.tweens.add({
                targets: note,
                x: note.x + Math.sin(angle) * speed,
                y: note.y - speed,
                alpha: 0,
                scale: 1.5,
                rotation: Phaser.Math.FloatBetween(-1, 1),
                duration: 400,
                delay: i * 40,
                ease: 'Cubic.easeOut',
            });
        });

        this.cameras.main.fadeOut(350, 0, 0, 0, (cam, progress) => {}, () => {});
        this.time.delayedCall(380, () => {
            this.scene.start('MainMenuScene');
        });
    }
}
