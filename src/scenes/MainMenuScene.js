import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_STYLE, NOTE_COLORS, MENU_COLORS, PRIVACY_POLICY_URL } from '../config.js';
import GameData from '../managers/GameData.js';
import IAPManager from '../managers/IAPManager.js';
import SoundManager from '../managers/SoundManager.js';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        this.settingsOpen = false;
        this.settingsElements = [];

        this.createBackground();
        this.createHeader();
        this.createMenuButtons();
        this.createSettingsGear();

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

        const colors = Object.values(NOTE_COLORS);
        for (let i = 0; i < 6; i++) {
            const x = Phaser.Math.Between(20, GAME_W - 20);
            const y = Phaser.Math.Between(80, GAME_H - 100);
            const circle = this.add.circle(x, y, Phaser.Math.Between(15, 40), colors[i % colors.length], 0.1);
            circle.setDepth(-9);
            this.tweens.add({
                targets: circle,
                y: y + Phaser.Math.Between(-20, 20),
                duration: Phaser.Math.Between(2500, 4000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
        }
    }

    createHeader() {
        // ロゴ/タイトルは表示しない
    }

    createMenuButtons() {
        const buttons = [
            { text: '🎵  ステージセレクト', color: MENU_COLORS.stageSelect, scene: 'StageSelectScene', delay: 0 },
            { text: '🔧  ステージエディタ', color: MENU_COLORS.stageEditor, scene: 'StageEditorScene', delay: 1 },
            { text: '🛒  ショップ', color: MENU_COLORS.shop, scene: 'ShopScene', delay: 2 },
        ];

        const startY = GAME_H * 0.38;
        const buttonW = 280;
        const buttonH = 64;
        const gap = 24;

        buttons.forEach((btn, index) => {
            const y = startY + index * (buttonH + gap);
            const container = this.createButton(
                GAME_W / 2, y, buttonW, buttonH,
                btn.text, btn.color, btn.textColor || '#FFFFFF',
                () => this.goToScene(btn.scene)
            );

            container.setAlpha(0);
            container.setY(y + 40);
            this.tweens.add({
                targets: container,
                alpha: 1,
                y: y,
                duration: 400,
                delay: 200 + btn.delay * 120,
                ease: 'Cubic.easeOut',
            });

            if (btn.scene === 'ShopScene') {
                this.shopButton = container;
                this.updateShopBadge(container, buttonW);
            }
        });
    }

    createButton(x, y, w, h, text, color, textColor, callback) {
        const container = this.add.container(x, y);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 16);
        container.add(shadow);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
        container.add(bg);

        const highlight = this.add.graphics();
        highlight.fillStyle(0xffffff, 0.2);
        highlight.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h / 2 - 4, 12);
        container.add(highlight);

        const label = this.add.text(0, 0, text, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: textColor,
            stroke: textColor === '#333333' ? '#00000022' : '#00000055',
            strokeThickness: 3,
        }).setOrigin(0.5);
        container.add(label);

        container.setSize(w, h).setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            this.tweens.add({ targets: container, scale: 0.95, duration: 50 });
        });
        container.on('pointerup', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
            SoundManager.playDecideSE();
            SoundManager.triggerHaptic(12);
            if (callback) callback();
        });
        container.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
        });
        container.on('pointerover', () => {
            if (container.scale >= 0.99) {
                this.tweens.add({ targets: container, scale: 1.02, duration: 80 });
            }
        });

        return container;
    }

    updateShopBadge(container, buttonW) {
        const adState = GameData.getAdState();
        if (adState.totalAdsShown >= 5 && !GameData.isPurchased('adFree')) {
            const badge = this.add.circle(buttonW / 2 - 10, -24, 8, 0xff5252, 1);
            container.add(badge);

            this.tweens.add({
                targets: badge,
                scale: 1.3,
                duration: 600,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
        }
    }

    createSettingsGear() {
        const gearX = GAME_W - 50;
        const gearY = 55;

        const gear = this.add.text(gearX, gearY, '⚙', {
            fontSize: '32px',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        gear.on('pointerdown', () => {
            this.tweens.add({ targets: gear, scale: 0.9, duration: 50 });
        });
        gear.on('pointerup', () => {
            this.tweens.add({ targets: gear, scale: 1.0, duration: 100 });
            SoundManager.playTapSE();
            SoundManager.triggerHaptic(8);
            this.toggleSettings();
        });
        gear.on('pointerout', () => {
            this.tweens.add({ targets: gear, scale: 1.0, duration: 100 });
        });
    }

    toggleSettings() {
        if (this.settingsOpen) {
            this.closeSettings();
        } else {
            this.openSettings();
        }
    }

    openSettings() {
        this.settingsOpen = true;

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, GAME_W, GAME_H);
        overlay.setDepth(100);
        overlay.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H),
            Phaser.Geom.Rectangle.Contains
        );
        overlay.on('pointerup', () => this.closeSettings());
        this.settingsElements.push(overlay);

        const panelW = 320;
        const panelH = 520;
        const panelX = GAME_W / 2;
        const panelY = GAME_H / 2;

        const panel = this.add.container(panelX, panelY);
        panel.setDepth(101);
        this.settingsElements.push(panel);

        const bg = this.add.graphics();
        bg.fillStyle(0x1e2a4a, 1);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 20);
        bg.lineStyle(2, 0x4d96ff, 0.5);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 20);
        panel.add(bg);

        const settingsTitle = this.add.text(0, -panelH / 2 + 35, '設定', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '28px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);
        panel.add(settingsTitle);

        const settings = GameData.getSettings();
        const toggles = [
            { key: 'bgmEnabled', label: 'BGM', y: -145 },
            { key: 'seEnabled', label: '効果音', y: -75 },
            { key: 'hapticEnabled', label: '振動', y: -5 },
        ];

        toggles.forEach(t => {
            this.createToggle(panel, t.label, t.y, settings[t.key], (val) => {
                GameData.setSetting(t.key, val);
            });
        });

        const separator = this.add.graphics();
        separator.lineStyle(1, 0x4d96ff, 0.3);
        separator.lineBetween(-panelW / 2 + 30, 45, panelW / 2 - 30, 45);
        panel.add(separator);

        this.createSettingsLinkButton(panel, '購入を復元', 90, '#888888', () => {
            this.handleRestorePurchases(panel);
        });

        this.createSettingsLinkButton(panel, 'プライバシーポリシー', 140, '#888888', () => {
            window.open(PRIVACY_POLICY_URL, '_blank');
        });

        this.createSettingsLinkButton(panel, 'データをリセット', 190, '#ff5252', () => {
            this.showResetConfirmation();
        });

        const closeBtn = this.add.text(0, panelH / 2 - 40, '閉じる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#aaaaaa',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerup', () => {
            SoundManager.playBackSE();
            this.closeSettings();
        });
        panel.add(closeBtn);

        panel.setScale(0.8);
        panel.setAlpha(0);
        this.tweens.add({
            targets: panel,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut',
        });
    }

    createToggle(panel, label, y, initialValue, onChange) {
        const labelText = this.add.text(-100, y, label, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '22px',
            color: '#FFFFFF',
        }).setOrigin(0, 0.5);
        panel.add(labelText);

        const toggleW = 60;
        const toggleH = 32;
        let isOn = initialValue;

        const toggleContainer = this.add.container(100, y);
        panel.add(toggleContainer);

        const toggleBg = this.add.graphics();
        const toggleKnob = this.add.circle(isOn ? 14 : -14, 0, 12, 0xffffff, 1);

        const drawToggle = () => {
            toggleBg.clear();
            toggleBg.fillStyle(isOn ? MENU_COLORS.toggleOn : MENU_COLORS.toggleOff, 1);
            toggleBg.fillRoundedRect(-toggleW / 2, -toggleH / 2, toggleW, toggleH, toggleH / 2);
        };
        drawToggle();

        toggleContainer.add(toggleBg);
        toggleContainer.add(toggleKnob);

        toggleContainer.setSize(toggleW + 20, toggleH + 20).setInteractive({ useHandCursor: true });
        toggleContainer.on('pointerup', () => {
            isOn = !isOn;
            drawToggle();
            SoundManager.playToggleSE();
            SoundManager.triggerHaptic(8);
            this.tweens.add({
                targets: toggleKnob,
                x: isOn ? 14 : -14,
                duration: 150,
                ease: 'Cubic.easeOut',
            });
            onChange(isOn);
        });
    }

    createSettingsLinkButton(panel, label, y, color, callback) {
        const btn = this.add.text(0, y, label, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: color,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerdown', () => btn.setAlpha(0.6));
        btn.on('pointerup', () => {
            btn.setAlpha(1);
            SoundManager.playTapSE();
            SoundManager.triggerHaptic(8);
            callback(btn);
        });
        btn.on('pointerout', () => btn.setAlpha(1));

        panel.add(btn);
        return btn;
    }

    async handleRestorePurchases(panel) {
        const statusText = this.add.text(0, 115, '復元中...', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#aaaaaa',
        }).setOrigin(0.5);
        panel.add(statusText);

        const restored = await IAPManager.restorePurchases();

        if (restored) {
            statusText.setText('復元しました！');
            statusText.setColor('#4db866');
        } else {
            statusText.setText('復元する購入がありません');
            statusText.setColor('#ff5252');
        }

        this.time.delayedCall(2500, () => {
            if (statusText && statusText.active) statusText.destroy();
        });
    }

    showResetConfirmation() {
        const confirmElements = [];

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, GAME_W, GAME_H);
        overlay.setDepth(200);
        overlay.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H),
            Phaser.Geom.Rectangle.Contains
        );
        confirmElements.push(overlay);

        const dialogW = 280;
        const dialogH = 180;
        const dialog = this.add.container(GAME_W / 2, GAME_H / 2);
        dialog.setDepth(201);
        confirmElements.push(dialog);

        const bg = this.add.graphics();
        bg.fillStyle(0x1e2a4a, 1);
        bg.fillRoundedRect(-dialogW / 2, -dialogH / 2, dialogW, dialogH, 16);
        bg.lineStyle(2, 0xff5252, 0.5);
        bg.strokeRoundedRect(-dialogW / 2, -dialogH / 2, dialogW, dialogH, 16);
        dialog.add(bg);

        const msg = this.add.text(0, -45, 'すべてのデータを\n削除しますか？', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#FFFFFF',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5);
        dialog.add(msg);

        const sub = this.add.text(0, 5, 'この操作は取り消せません', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            color: '#ff8888',
        }).setOrigin(0.5);
        dialog.add(sub);

        const destroyConfirm = () => {
            confirmElements.forEach(el => {
                if (el && el.active) el.destroy();
            });
        };

        const btnW = 110;
        const btnH = 40;

        const cancelBtn = this.add.container(-70, 55);
        const cancelBg = this.add.graphics();
        cancelBg.fillStyle(0x444444, 1);
        cancelBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
        cancelBtn.add(cancelBg);
        const cancelLabel = this.add.text(0, 0, 'キャンセル', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        cancelBtn.add(cancelLabel);
        cancelBtn.setSize(btnW, btnH).setInteractive({ useHandCursor: true });
        cancelBtn.on('pointerdown', () => this.tweens.add({ targets: cancelBtn, scale: 0.95, duration: 50 }));
        cancelBtn.on('pointerup', () => {
            this.tweens.add({ targets: cancelBtn, scale: 1.0, duration: 100 });
            SoundManager.playBackSE();
            destroyConfirm();
        });
        cancelBtn.on('pointerout', () => this.tweens.add({ targets: cancelBtn, scale: 1.0, duration: 100 }));
        dialog.add(cancelBtn);

        const resetBtn = this.add.container(70, 55);
        const resetBg = this.add.graphics();
        resetBg.fillStyle(MENU_COLORS.danger, 1);
        resetBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
        resetBtn.add(resetBg);
        const resetLabel = this.add.text(0, 0, 'リセット', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        resetBtn.add(resetLabel);
        resetBtn.setSize(btnW, btnH).setInteractive({ useHandCursor: true });
        resetBtn.on('pointerdown', () => this.tweens.add({ targets: resetBtn, scale: 0.95, duration: 50 }));
        resetBtn.on('pointerup', () => {
            this.tweens.add({ targets: resetBtn, scale: 1.0, duration: 100 });
            SoundManager.playTapSE();
            GameData.resetAll();
            destroyConfirm();
            this.closeSettings();
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('BootScene');
            });
        });
        resetBtn.on('pointerout', () => this.tweens.add({ targets: resetBtn, scale: 1.0, duration: 100 }));
        dialog.add(resetBtn);

        dialog.setScale(0.8);
        dialog.setAlpha(0);
        this.tweens.add({
            targets: dialog,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut',
        });
    }

    closeSettings() {
        this.settingsOpen = false;
        this.settingsElements.forEach(el => {
            if (el && el.active) el.destroy();
        });
        this.settingsElements = [];
    }

    goToScene(sceneName) {
        if (this.settingsOpen) return;
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            this.scene.start(sceneName);
        });
    }
}
