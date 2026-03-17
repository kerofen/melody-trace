import Phaser from 'phaser';
import { GAME_W, GAME_H, SAFE, NOTE_COLORS, MENU_COLORS } from '../config.js';
import GameData from '../managers/GameData.js';
import IAPManager from '../managers/IAPManager.js';
import SoundManager from '../managers/SoundManager.js';

export default class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
    }

    create() {
        this.createBackground();
        this.createHeader();
        this.createAdFreeCard();
        this.createRestoreButton();
        this.createBackButton();
        this.cameras.main.fadeIn(300);
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
    }

    createHeader() {
        this.add.text(GAME_W / 2, 80, 'ショップ', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '34px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5);
    }

    createAdFreeCard() {
        const cardW = 320;
        const cardH = 260;
        const cardX = GAME_W / 2;
        const cardY = GAME_H * 0.38;
        const isPurchased = IAPManager.isAdRemovalPurchased();

        const container = this.add.container(cardX, cardY);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 8, cardW, cardH, 20);
        container.add(shadow);

        const bg = this.add.graphics();
        bg.fillStyle(0x1e2a4a, 0.95);
        bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
        container.add(bg);

        const borderGlow = this.add.graphics();
        borderGlow.lineStyle(2, 0xffd93d, 0.6);
        borderGlow.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
        container.add(borderGlow);

        const icon = this.add.text(0, -cardH / 2 + 55, '🚫', {
            fontSize: '48px',
        }).setOrigin(0.5);
        container.add(icon);

        const adText = this.add.text(0, -cardH / 2 + 55, '広告', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#ff5252',
        }).setOrigin(0.5);
        container.add(adText);

        const title = this.add.text(0, -20, '広告をすべて削除', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);
        container.add(title);

        const desc = this.add.text(0, 18, 'ゲーム中の全画面広告がなくなります', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#aaaaaa',
        }).setOrigin(0.5);
        container.add(desc);

        if (isPurchased) {
            this.createPurchasedBadge(container, cardH);
        } else {
            this.createPurchaseButton(container, cardH);
        }

        this.cardContainer = container;

        container.setAlpha(0);
        container.setY(cardY + 30);
        this.tweens.add({
            targets: container,
            alpha: 1,
            y: cardY,
            duration: 400,
            delay: 200,
            ease: 'Cubic.easeOut',
        });
    }

    createPurchasedBadge(container, cardH) {
        const badge = this.add.container(0, cardH / 2 - 50);

        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(0x4db866, 1);
        badgeBg.fillRoundedRect(-80, -20, 160, 40, 10);
        badge.add(badgeBg);

        const checkText = this.add.text(0, 0, '✓ 購入済み', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        badge.add(checkText);

        container.add(badge);
    }

    createPurchaseButton(container, cardH) {
        const btnW = 220;
        const btnH = 52;
        const btnY = cardH / 2 - 50;

        const btnContainer = this.add.container(0, btnY);

        const btnShadow = this.add.graphics();
        btnShadow.fillStyle(0x000000, 0.3);
        btnShadow.fillRoundedRect(-btnW / 2 + 3, -btnH / 2 + 4, btnW, btnH, 14);
        btnContainer.add(btnShadow);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(MENU_COLORS.gold, 1);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 14);
        btnContainer.add(btnBg);

        const btnHighlight = this.add.graphics();
        btnHighlight.fillStyle(0xffffff, 0.25);
        btnHighlight.fillRoundedRect(-btnW / 2 + 4, -btnH / 2 + 4, btnW - 8, btnH / 2 - 4, 10);
        btnContainer.add(btnHighlight);

        const price = IAPManager.getPrice();
        const btnLabel = this.add.text(0, 0, `${price} で購入`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#333333',
            stroke: '#00000022',
            strokeThickness: 2,
        }).setOrigin(0.5);
        btnContainer.add(btnLabel);

        btnContainer.setSize(btnW, btnH).setInteractive({ useHandCursor: true });

        btnContainer.on('pointerdown', () => {
            this.tweens.add({ targets: btnContainer, scale: 0.95, duration: 50 });
        });
        btnContainer.on('pointerup', () => {
            this.tweens.add({ targets: btnContainer, scale: 1.0, duration: 100 });
            SoundManager.playTapSE();
            SoundManager.triggerHaptic(10);
            this.handlePurchase(btnContainer, btnLabel, container, cardH);
        });
        btnContainer.on('pointerout', () => {
            this.tweens.add({ targets: btnContainer, scale: 1.0, duration: 100 });
        });

        this.tweens.add({
            targets: btnContainer,
            scale: 1.03,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        container.add(btnContainer);
    }

    async handlePurchase(btnContainer, btnLabel, cardContainer, cardH) {
        btnContainer.removeInteractive();
        this.tweens.killTweensOf(btnContainer);
        btnLabel.setText('処理中...');

        const success = await IAPManager.purchase();

        if (success) {
            this.tweens.add({
                targets: btnContainer,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    btnContainer.destroy();
                    this.createPurchasedBadge(cardContainer, cardH);
                },
            });
            this.showPurchaseEffect();
        } else {
            const price = IAPManager.getPrice();
            btnLabel.setText(`${price} で購入`);
            btnContainer.setInteractive({ useHandCursor: true });
            this.tweens.add({
                targets: btnContainer,
                scale: 1.03,
                duration: 800,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
        }
    }

    createRestoreButton() {
        const y = GAME_H * 0.68;
        const restoreText = this.add.text(GAME_W / 2, y, '購入を復元', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#888888',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        restoreText.on('pointerdown', () => {
            restoreText.setColor('#aaaaaa');
        });
        restoreText.on('pointerup', async () => {
            restoreText.setColor('#888888');
            SoundManager.playTapSE();
            restoreText.setText('復元中...');

            const restored = await IAPManager.restorePurchases();

            if (restored) {
                restoreText.setText('復元しました！');
                restoreText.setColor('#4db866');
                this.time.delayedCall(1000, () => {
                    this.scene.restart();
                });
            } else {
                restoreText.setText('復元する購入がありません');
                restoreText.setColor('#ff5252');
                this.time.delayedCall(2000, () => {
                    restoreText.setText('購入を復元');
                    restoreText.setColor('#888888');
                });
            }
        });
    }

    showPurchaseEffect() {
        this.cameras.main.flash(200, 255, 215, 0, false);

        const msg = this.add.text(GAME_W / 2, GAME_H * 0.65, 'ありがとうございます！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '28px',
            color: '#ffd93d',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setScale(0).setDepth(200);

        this.tweens.add({
            targets: msg,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut',
        });

        this.tweens.add({
            targets: msg,
            alpha: 0,
            y: GAME_H * 0.62,
            duration: 600,
            delay: 2000,
        });

        const colors = Object.values(NOTE_COLORS);
        for (let i = 0; i < 40; i++) {
            const confetti = this.add.rectangle(
                GAME_W / 2 + Phaser.Math.Between(-20, 20),
                GAME_H * 0.55,
                Phaser.Math.Between(4, 10),
                Phaser.Math.Between(4, 10),
                colors[i % colors.length],
                1
            ).setDepth(199);

            const angle = Phaser.Math.Between(0, 360) * Math.PI / 180;
            const speed = Phaser.Math.Between(80, 200);
            const tx = confetti.x + Math.cos(angle) * speed;
            const ty = confetti.y + Math.sin(angle) * speed + 100;

            this.tweens.add({
                targets: confetti,
                x: tx,
                y: ty,
                rotation: Phaser.Math.Between(-3, 3),
                alpha: 0,
                duration: Phaser.Math.Between(800, 1500),
                delay: Phaser.Math.Between(0, 200),
                ease: 'Cubic.easeOut',
                onComplete: () => confetti.destroy(),
            });
        }
    }

    createBackButton() {
        const btnY = SAFE.TOP + 30;

        const container = this.add.container(30, btnY);
        container.setDepth(20);

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.3);
        bg.fillRoundedRect(-18, -18, 36, 36, 10);
        container.add(bg);

        const arrow = this.add.text(0, 0, '←', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '22px',
            color: '#ffffff',
        }).setOrigin(0.5);
        container.add(arrow);

        container.setSize(36, 36).setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            SoundManager.playBackSE();
            SoundManager.triggerHaptic(8);
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('MainMenuScene');
            });
        });

        container.on('pointerover', () => {
            this.tweens.add({ targets: container, scale: 1.1, duration: 100 });
        });
        container.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
        });
    }
}
