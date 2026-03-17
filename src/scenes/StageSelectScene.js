import Phaser from 'phaser';
import { GAME_W, GAME_H, SAFE, TEXT_STYLE, NOTE_COLORS, PALETTE, INSTRUMENTS, MENU_COLORS } from '../config.js';
import { STAGES } from '../data/stages.js';
import GameData from '../managers/GameData.js';
import SoundManager from '../managers/SoundManager.js';
import { decodeStage } from '../managers/ShareCode.js';

export default class StageSelectScene extends Phaser.Scene {
    constructor() {
        super('StageSelectScene');
    }

    create() {
        this.createBackground();
        this.createHeader();
        this.createScrollableList();
        this.createBackButton();
        this.createScrollIndicator();
        this.cameras.main.fadeIn(300);
    }

    createBackground() {
        const bgGraphics = this.add.graphics();
        bgGraphics.setDepth(-10);
        const steps = 20;
        for (let i = 0; i < steps; i++) {
            const ratio = i / steps;
            const r = Math.floor(26 + ratio * 20);
            const g = Math.floor(26 - ratio * 10);
            const b = Math.floor(46 + ratio * 30);
            const color = (r << 16) | (g << 8) | b;
            bgGraphics.fillStyle(color, 1);
            bgGraphics.fillRect(0, (GAME_H / steps) * i, GAME_W, GAME_H / steps + 1);
        }
    }

    createHeader() {
        this.add.text(GAME_W / 2, 50, 'ステージ選択', {
            ...TEXT_STYLE.title,
            fontSize: '32px',
        }).setOrigin(0.5).setDepth(50);

        this.add.text(GAME_W / 2, 88, '演奏する曲を選ぼう', {
            ...TEXT_STYLE.subtitle,
            fontSize: '16px',
            color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(50);

        // 進捗バー
        const stageKeys = Object.keys(STAGES);
        const stageResults = GameData.getAllStageResults();
        const clearedCount = stageKeys.filter(k => stageResults[k]).length;
        const total = stageKeys.length;

        const barY = 112;
        const barW = 200;
        const barH = 8;
        const barX = GAME_W / 2 - barW / 2;

        const barBg = this.add.graphics();
        barBg.setDepth(50);
        barBg.fillStyle(0xffffff, 0.15);
        barBg.fillRoundedRect(barX, barY, barW, barH, barH / 2);

        if (clearedCount > 0) {
            const fillW = (barW * clearedCount) / total;
            barBg.fillStyle(0xffd93d, 0.8);
            barBg.fillRoundedRect(barX, barY, Math.max(fillW, barH), barH, barH / 2);
        }

        const progressText = clearedCount === total
            ? '★ 全曲クリア！ ★'
            : `${clearedCount} / ${total} クリア`;
        this.add.text(GAME_W / 2, barY + 20, progressText, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '12px',
            color: clearedCount === total ? '#ffd93d' : '#888888',
        }).setOrigin(0.5).setDepth(50);

        const headerBg = this.add.graphics();
        headerBg.setDepth(49);
        headerBg.fillStyle(0x1a1a2e, 1);
        headerBg.fillRect(0, 0, GAME_W, 140);
        headerBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x1a1a2e, 0x1a1a2e, 1, 1, 0, 0);
        headerBg.fillRect(0, 140, GAME_W, 15);
    }

    createScrollableList() {
        const stageKeys = Object.keys(STAGES);
        const customStages = GameData.getCustomStages();
        const stageResults = GameData.getAllStageResults();

        const cardW = 320;
        const cardH = 100;
        const gap = 16;
        const startY = 210;
        const bottomPadding = 120;

        this.scrollContainer = this.add.container(0, 0);
        this.scrollContainer.setDepth(10);

        const stageStyles = {
            twinkleStar: { icon: '⭐', accentColor: 0xffd93d },
            odeToJoy: { icon: '🎵', accentColor: 0x4d96ff },
            jingleBells: { icon: '🔔', accentColor: 0xc41e3a },
            kaeruNoUta: { icon: '🐸', accentColor: 0x4db866 },
            chouchou: { icon: '🦋', accentColor: 0xffb7c5 },
            bunbunbun: { icon: '🐝', accentColor: 0xffd700 },
            maryLamb: { icon: '🐑', accentColor: 0xe8e8e8 },
            londonBridge: { icon: '🌉', accentColor: 0xff6b6b },
            hotaruNoHikari: { icon: '✨', accentColor: 0x4ecdc4 },
        };

        let yPos = startY;
        let foundNext = false;

        stageKeys.forEach((key, index) => {
            const stage = STAGES[key];
            const style = stageStyles[key] || { icon: '♪', accentColor: 0x6bcb77 };
            const result = stageResults[key] || null;
            const isNext = !foundNext && !result;
            if (isNext) foundNext = true;

            this.createStageCard(
                this.scrollContainer, GAME_W / 2, yPos,
                cardW, cardH, stage, key, style, index, result, 'select', isNext
            );
            yPos += cardH + gap;
        });

        if (customStages.length > 0) {
            yPos += 20;
            const customLabel = this.add.text(GAME_W / 2, yPos, '── カスタムステージ ──', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '16px',
                color: '#888888',
            }).setOrigin(0.5);
            this.scrollContainer.add(customLabel);
            yPos += cardH / 2 + 20;

            customStages.forEach((stage, index) => {
                const style = { icon: '🎵', accentColor: 0xa855f7 };
                this.createStageCard(
                    this.scrollContainer, GAME_W / 2, yPos,
                    cardW, cardH, stage, stage.id, style,
                    stageKeys.length + index, null, 'custom', false
                );
                yPos += cardH + gap;
            });
        }

        yPos += 10;
        this.createShareCodeInput(yPos);
        yPos += 80;

        this.contentHeight = yPos + bottomPadding;
        this.scrollY = 0;
        this.maxScrollY = Math.max(0, this.contentHeight - GAME_H);

        this.setupScrollInput();
    }

    createStageCard(parent, x, y, w, h, stage, stageKey, style, index, result, type, isNext) {
        const container = this.add.container(x, y);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.25);
        shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 5, w, h, 16);
        container.add(shadow);

        // クリア済みは少しだけ暗め、未クリアはフル表示
        const bgAlpha = result ? 0.85 : 0.95;
        const bg = this.add.graphics();
        bg.fillStyle(0x1e2a4a, bgAlpha);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
        container.add(bg);

        const accentBar = this.add.graphics();
        accentBar.fillStyle(style.accentColor, 1);
        accentBar.fillRoundedRect(-w / 2, -h / 2, 6, h, { tl: 16, bl: 16, tr: 0, br: 0 });
        container.add(accentBar);

        const icon = this.add.text(-w / 2 + 38, 0, style.icon, {
            fontSize: '28px',
        }).setOrigin(0.5);
        container.add(icon);

        const title = this.add.text(20, -15, stage.title, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 0.5);
        container.add(title);

        const hint = this.add.text(20, 14, stage.hint || `♪×${stage.answer.length}`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            color: '#999999',
        }).setOrigin(0.5, 0.5);
        container.add(hint);

        // 星評価の表示（チェックマークの代わり）
        this.createStarRating(container, w, result);

        // 楽器アイコン
        const inst = INSTRUMENTS[stage.instrument || 'piano'];
        if (inst) {
            const instLabel = this.add.text(w / 2 - 25, 25, `${inst.icon}`, {
                fontSize: '16px',
            }).setOrigin(0.5);
            container.add(instLabel);
        }

        // NEXTバッジ
        if (isNext) {
            const nextBadge = this.add.container(-w / 2 + 10, -h / 2 - 5);

            const nextBg = this.add.graphics();
            nextBg.fillStyle(0xff6b6b, 1);
            nextBg.fillRoundedRect(0, 0, 48, 20, 6);
            nextBadge.add(nextBg);

            const nextText = this.add.text(24, 10, 'NEXT', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '11px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1,
            }).setOrigin(0.5);
            nextBadge.add(nextText);

            container.add(nextBadge);

            // NEXTバッジのパルス
            this.tweens.add({
                targets: nextBadge,
                scale: { from: 1.0, to: 1.1 },
                duration: 600,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
        }

        container.setSize(w, h).setInteractive({ useHandCursor: true });
        container.on('pointerdown', () => {
            this.tweens.add({ targets: container, scale: 0.96, duration: 80 });
        });
        container.on('pointerup', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
            SoundManager.playDecideSE();
            SoundManager.triggerHaptic(12);
            this.selectStage(stageKey, type, stage);
        });
        container.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
        });

        container.setAlpha(0);
        container.setY(y + 30);
        this.tweens.add({
            targets: container,
            alpha: 1,
            y: y,
            duration: 350,
            delay: 100 + index * 80,
            ease: 'Cubic.easeOut',
        });

        parent.add(container);
    }

    createStarRating(container, w, result) {
        const starX = w / 2 - 30;
        const starY = -8;
        const starGap = 18;

        for (let i = 0; i < 3; i++) {
            const filled = result && result.stars > i;
            const starChar = filled ? '★' : '☆';
            const starColor = filled ? '#ffd93d' : '#555555';

            const star = this.add.text(starX, starY + (i - 1) * starGap - 2, starChar, {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '16px',
                color: starColor,
            }).setOrigin(0.5);
            container.add(star);
        }
    }

    createShareCodeInput(y) {
        const inputContainer = this.add.container(GAME_W / 2, y);
        this.scrollContainer.add(inputContainer);

        const btnW = 260;
        const btnH = 44;

        const bg = this.add.graphics();
        bg.fillStyle(0x1e2a4a, 0.8);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
        bg.lineStyle(1, 0x4d96ff, 0.3);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
        inputContainer.add(bg);

        const label = this.add.text(0, 0, '共有コードを読み込む', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#4d96ff',
        }).setOrigin(0.5);
        inputContainer.add(label);

        inputContainer.setSize(btnW, btnH).setInteractive({ useHandCursor: true });

        inputContainer.on('pointerdown', () => {
            this.tweens.add({ targets: inputContainer, scale: 0.95, duration: 50 });
        });
        inputContainer.on('pointerup', () => {
            this.tweens.add({ targets: inputContainer, scale: 1.0, duration: 100 });
            SoundManager.playTapSE();
            SoundManager.triggerHaptic(8);
            this.showCodeInputModal();
        });
        inputContainer.on('pointerout', () => {
            this.tweens.add({ targets: inputContainer, scale: 1.0, duration: 100 });
        });
    }

    showCodeInputModal() {
        const code = prompt('共有コードを入力してください:');
        if (!code) return;

        const stageData = decodeStage(code.trim());
        if (!stageData) {
            SoundManager.playErrorSE();
            this.showToast('無効なコードです');
            return;
        }

        SoundManager.playSuccessSE();
        const saved = GameData.addCustomStage(stageData);
        this.showToast(`「${stageData.title}」を追加しました！`);

        this.time.delayedCall(800, () => {
            this.scene.restart();
        });
    }

    showToast(message) {
        const toast = this.add.text(GAME_W / 2, GAME_H - 150, message, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
            backgroundColor: '#333333',
            padding: { x: 16, y: 8 },
        }).setOrigin(0.5).setDepth(500);

        this.tweens.add({
            targets: toast,
            alpha: 0,
            y: GAME_H - 180,
            duration: 500,
            delay: 1500,
            onComplete: () => toast.destroy(),
        });
    }

    createScrollIndicator() {
        if (this.maxScrollY <= 0) return;

        this.scrollIndicator = this.add.graphics();
        this.scrollIndicator.setDepth(55);
        this.updateScrollIndicator();
    }

    updateScrollIndicator() {
        if (!this.scrollIndicator || this.maxScrollY <= 0) return;

        this.scrollIndicator.clear();
        const trackH = GAME_H - 160 - 70;
        const trackX = GAME_W - 6;
        const trackY = 155;
        const thumbH = Math.max(30, (GAME_H / this.contentHeight) * trackH);
        const thumbY = trackY + (this.scrollY / this.maxScrollY) * (trackH - thumbH);

        this.scrollIndicator.fillStyle(0xffffff, 0.15);
        this.scrollIndicator.fillRoundedRect(trackX, trackY, 4, trackH, 2);
        this.scrollIndicator.fillStyle(0xffffff, 0.4);
        this.scrollIndicator.fillRoundedRect(trackX, thumbY, 4, thumbH, 2);
    }

    setupScrollInput() {
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartScrollY = 0;
        this.velocity = 0;

        this.input.on('pointerdown', (pointer) => {
            this.isDragging = true;
            this.dragStartY = pointer.y;
            this.dragStartScrollY = this.scrollY;
            this.velocity = 0;
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.isDragging) return;
            const dy = this.dragStartY - pointer.y;
            this.scrollY = Phaser.Math.Clamp(
                this.dragStartScrollY + dy, 0, this.maxScrollY
            );
            this.scrollContainer.setY(-this.scrollY);
            this.velocity = dy;
            this.updateScrollIndicator();
        });

        this.input.on('pointerup', () => {
            this.isDragging = false;
        });
    }

    update() {
        if (!this.isDragging && Math.abs(this.velocity) > 0.5) {
            this.velocity *= 0.92;
            this.scrollY = Phaser.Math.Clamp(
                this.scrollY + this.velocity * 0.1, 0, this.maxScrollY
            );
            this.scrollContainer.setY(-this.scrollY);
            this.updateScrollIndicator();
        }
    }

    createBackButton() {
        const btnY = SAFE.TOP + 30;

        const container = this.add.container(30, btnY);
        container.setDepth(50);

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

    selectStage(stageKey, type, stageData) {
        GameData.recordPlay();
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            if (type === 'custom') {
                this.scene.start('GameScene', {
                    source: 'select',
                    stageKey: null,
                    customStageData: stageData,
                });
            } else {
                this.scene.start('GameScene', {
                    source: 'select',
                    stageKey: stageKey,
                });
            }
        });
    }
}
