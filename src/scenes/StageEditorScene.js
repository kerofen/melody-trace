import Phaser from 'phaser';
import { GAME_W, GAME_H, NOTE_COLORS, NOTE_NAMES, INSTRUMENTS, MENU_COLORS, getAudioPath } from '../config.js';
import GameData from '../managers/GameData.js';
import SoundManager from '../managers/SoundManager.js';
import { encodeStage, decodeStage } from '../managers/ShareCode.js';

const MAX_NOTES = 30;

const CHROMATIC_NOTES = [
    { name: 'ド', id: 'C', isSharp: false },
    { name: 'ド#', id: 'Cs', isSharp: true },
    { name: 'レ', id: 'D', isSharp: false },
    { name: 'レ#', id: 'Ds', isSharp: true },
    { name: 'ミ', id: 'E', isSharp: false },
    { name: 'ファ', id: 'F', isSharp: false },
    { name: 'ファ#', id: 'Fs', isSharp: true },
    { name: 'ソ', id: 'G', isSharp: false },
    { name: 'ソ#', id: 'Gs', isSharp: true },
    { name: 'ラ', id: 'A', isSharp: false },
    { name: 'ラ#', id: 'As', isSharp: true },
    { name: 'シ', id: 'B', isSharp: false },
];

const INSTRUMENT_CATEGORIES = {
    keyboard: 'キーボード',
    strings: '弦楽器',
    wind: '管楽器',
    vocal: 'ボーカル',
    mallet: '打楽器',
    synth: 'シンセ',
    world: 'ワールド',
};

export default class StageEditorScene extends Phaser.Scene {
    constructor() {
        super('StageEditorScene');
    }

    init(data) {
        this.notes = data?.notes || [];
        this.selectedInstrument = data?.instrument || 'piano';
        this.currentOctave = data?.octave || 4;
        this.stageTitle = data?.title || 'マイステージ';
        this.audioLoaded = false;
        this.modalOpen = false;
    }

    create() {
        this.createBackground();
        this.createTopBar();
        this.createTitleInput();
        this.createNoteChips();
        this.createInstrumentSelector();
        this.createOctaveSelector();
        this.createNoteButtons();
        this.createBottomActions();
        this.cameras.main.fadeIn(300);

        // 音声をプリロード
        this.preloadCurrentOctaveAudio();
    }

    /** 現在の楽器+オクターブの音声をプリロード */
    preloadCurrentOctaveAudio() {
        const instrument = this.selectedInstrument;
        let needsLoad = false;

        CHROMATIC_NOTES.forEach(note => {
            const noteId = `${note.id}${this.currentOctave}`;
            const key = `${instrument}_${noteId}`;
            if (!this.cache.audio.exists(key)) {
                this.load.audio(key, getAudioPath(instrument, noteId));
                needsLoad = true;
            }
        });

        if (needsLoad) {
            this.load.on('loaderror', (file) => {
                console.warn(`Audio load failed: ${file.key}`);
            });
            this.load.once('complete', () => {
                this.audioLoaded = true;
            });
            this.load.start();
        } else {
            this.audioLoaded = true;
        }
    }

    /** ノートの音を再生（桜井イズム: 触り心地の根本改善） */
    playNoteSound(noteId) {
        const soundKey = `${this.selectedInstrument}_${noteId}`;
        if (this.cache.audio.exists(soundKey)) {
            this.sound.play(soundKey, { volume: 0.7 });
        }
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

    createTopBar() {
        const backBtn = this.add.container(65, 50);
        const backBg = this.add.graphics();
        backBg.fillStyle(MENU_COLORS.back, 1);
        backBg.fillRoundedRect(-55, -18, 110, 36, 10);
        backBtn.add(backBg);
        const backLabel = this.add.text(0, 0, '← もどる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        backBtn.add(backLabel);
        backBtn.setSize(110, 36).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => this.tweens.add({ targets: backBtn, scale: 0.95, duration: 50 }));
        backBtn.on('pointerup', () => {
            this.tweens.add({ targets: backBtn, scale: 1.0, duration: 100 });
            SoundManager.playBackSE();
            SoundManager.triggerHaptic(8);
            this.goBack();
        });
        backBtn.on('pointerout', () => this.tweens.add({ targets: backBtn, scale: 1.0, duration: 100 }));

        const playBtn = this.add.container(GAME_W - 65, 50);
        const playBg = this.add.graphics();
        playBg.fillStyle(this.notes.length >= 3 ? MENU_COLORS.stageSelect : 0x555555, 1);
        playBtn.add(playBg);
        const playLabel = this.add.text(0, 0, 'プレイ ▶', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        playBtn.add(playLabel);
        playBtn.setSize(110, 36).setInteractive({ useHandCursor: true });
        playBtn.on('pointerdown', () => this.tweens.add({ targets: playBtn, scale: 0.95, duration: 50 }));
        playBtn.on('pointerup', () => {
            this.tweens.add({ targets: playBtn, scale: 1.0, duration: 100 });
            SoundManager.playDecideSE();
            SoundManager.triggerHaptic(12);
            this.playStage();
        });
        playBtn.on('pointerout', () => this.tweens.add({ targets: playBtn, scale: 1.0, duration: 100 }));
        this.playButton = playBtn;
        this.playButtonBg = playBg;

        this.updatePlayButtonBg = () => {
            this.playButtonBg.clear();
            this.playButtonBg.fillStyle(this.notes.length >= 3 ? MENU_COLORS.stageSelect : 0x555555, 1);
            this.playButtonBg.fillRoundedRect(-55, -18, 110, 36, 10);
        };
        this.updatePlayButtonBg();
    }

    createTitleInput() {
        const y = 100;
        this.add.text(30, y, 'タイトル:', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#888888',
        });

        const titleBg = this.add.graphics();
        titleBg.fillStyle(0x0d1b2a, 0.8);
        titleBg.fillRoundedRect(30, y + 20, GAME_W - 60, 36, 8);
        titleBg.lineStyle(1, 0x4d96ff, 0.3);
        titleBg.strokeRoundedRect(30, y + 20, GAME_W - 60, 36, 8);

        this.titleText = this.add.text(42, y + 38, this.stageTitle, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
        }).setOrigin(0, 0.5);

        const titleHitArea = this.add.rectangle(GAME_W / 2, y + 38, GAME_W - 60, 36);
        titleHitArea.setInteractive({ useHandCursor: true });
        titleHitArea.on('pointerup', () => {
            SoundManager.playTapSE();
            this.showInputModal('ステージタイトルを入力', this.stageTitle, (val) => {
                if (val !== null && val.trim()) {
                    this.stageTitle = val.trim();
                    this.titleText.setText(this.stageTitle);
                }
            });
        });
    }

    /** カスタムモーダル（prompt()の代わり） */
    showInputModal(title, defaultValue, onConfirm, maxLength = 30) {
        if (this.modalOpen) return;
        this.modalOpen = true;

        const elements = [];

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, GAME_W, GAME_H);
        overlay.setDepth(300);
        overlay.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H),
            Phaser.Geom.Rectangle.Contains
        );
        elements.push(overlay);

        const panelW = 320;
        const panelH = 200;
        const panel = this.add.container(GAME_W / 2, GAME_H / 2);
        panel.setDepth(301);
        elements.push(panel);

        const bg = this.add.graphics();
        bg.fillStyle(0x1e2a4a, 1);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
        bg.lineStyle(2, 0x4d96ff, 0.5);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
        panel.add(bg);

        const titleText = this.add.text(0, -panelH / 2 + 30, title, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        panel.add(titleText);

        // HTML input要素を使用
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.value = defaultValue || '';
        inputEl.maxLength = maxLength;
        inputEl.style.cssText = `
            position: absolute; left: 50%; top: 50%; transform: translate(-50%, -30px);
            width: 240px; height: 36px; font-size: 16px; text-align: center;
            background: #0d1b2a; color: #fff; border: 1px solid #4d96ff;
            border-radius: 8px; outline: none; font-family: KeiFont, sans-serif;
            z-index: 9999;
        `;
        const gameContainer = document.getElementById('game-container');
        gameContainer.appendChild(inputEl);
        this.time.delayedCall(100, () => inputEl.focus());

        const closeModal = () => {
            this.modalOpen = false;
            if (inputEl.parentNode) inputEl.remove();
            elements.forEach(el => { if (el && el.active) el.destroy(); });
        };

        // OKボタン
        const okBtn = this.add.container(50, panelH / 2 - 40);
        const okBg = this.add.graphics();
        okBg.fillStyle(0x4d96ff, 1);
        okBg.fillRoundedRect(-55, -16, 110, 32, 8);
        okBtn.add(okBg);
        const okLabel = this.add.text(0, 0, 'OK', {
            fontFamily: 'KeiFont, sans-serif', fontSize: '16px', color: '#fff',
        }).setOrigin(0.5);
        okBtn.add(okLabel);
        okBtn.setSize(110, 32).setInteractive({ useHandCursor: true });
        okBtn.on('pointerup', () => {
            SoundManager.playDecideSE();
            const val = inputEl.value;
            closeModal();
            onConfirm(val);
        });
        panel.add(okBtn);

        // キャンセルボタン
        const cancelBtn = this.add.container(-50, panelH / 2 - 40);
        const cancelBg = this.add.graphics();
        cancelBg.fillStyle(0x555555, 1);
        cancelBg.fillRoundedRect(-55, -16, 110, 32, 8);
        cancelBtn.add(cancelBg);
        const cancelLabel = this.add.text(0, 0, 'キャンセル', {
            fontFamily: 'KeiFont, sans-serif', fontSize: '14px', color: '#aaa',
        }).setOrigin(0.5);
        cancelBtn.add(cancelLabel);
        cancelBtn.setSize(110, 32).setInteractive({ useHandCursor: true });
        cancelBtn.on('pointerup', () => {
            SoundManager.playBackSE();
            closeModal();
            onConfirm(null);
        });
        panel.add(cancelBtn);

        // Enter keyで確定
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                SoundManager.playDecideSE();
                const val = inputEl.value;
                closeModal();
                onConfirm(val);
            }
        });

        panel.setScale(0.9);
        panel.setAlpha(0);
        this.tweens.add({
            targets: panel,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut',
        });
    }

    createNoteChips() {
        const y = 175;
        this.noteCountLabel = this.add.text(30, y, `♪ 入力した音符 (${this.notes.length}/${MAX_NOTES})`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#888888',
        });

        const chipAreaTop = y + 18;
        const chipAreaH = 96;

        const chipAreaBg = this.add.graphics();
        chipAreaBg.fillStyle(0x0d1b2a, 0.4);
        chipAreaBg.fillRoundedRect(8, chipAreaTop, GAME_W - 16, chipAreaH, 8);

        this.chipAreaTop = chipAreaTop;
        this.chipAreaH = chipAreaH;
        this.chipContainer = this.add.container(0, chipAreaTop + 4);

        const maskGfx = this.make.graphics();
        maskGfx.fillStyle(0xffffff);
        maskGfx.fillRect(0, chipAreaTop, GAME_W, chipAreaH);
        this.chipContainer.setMask(maskGfx.createGeometryMask());

        this.updateNoteChips();

        const delBtnY = chipAreaTop + chipAreaH + 8;
        const delBtn = this.add.container(GAME_W - 70, delBtnY);
        const delBg = this.add.graphics();
        delBg.fillStyle(MENU_COLORS.danger, 0.8);
        delBg.fillRoundedRect(-50, -14, 100, 28, 8);
        delBtn.add(delBg);
        const delLabel = this.add.text(0, 0, '× 最後を消す', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '12px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        delBtn.add(delLabel);
        delBtn.setSize(100, 28).setInteractive({ useHandCursor: true });
        delBtn.on('pointerdown', () => this.tweens.add({ targets: delBtn, scale: 0.95, duration: 50 }));
        delBtn.on('pointerup', () => {
            this.tweens.add({ targets: delBtn, scale: 1.0, duration: 100 });
            SoundManager.playTapSE();
            SoundManager.triggerHaptic(8);
            this.removeLastNote();
        });
        delBtn.on('pointerout', () => this.tweens.add({ targets: delBtn, scale: 1.0, duration: 100 }));

        const clearBtn = this.add.container(GAME_W - 180, delBtnY);
        const clearBg = this.add.graphics();
        clearBg.fillStyle(0x555555, 0.8);
        clearBg.fillRoundedRect(-45, -14, 90, 28, 8);
        clearBtn.add(clearBg);
        const clearLabel = this.add.text(0, 0, '全消し', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '12px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        clearBtn.add(clearLabel);
        clearBtn.setSize(90, 28).setInteractive({ useHandCursor: true });
        clearBtn.on('pointerdown', () => this.tweens.add({ targets: clearBtn, scale: 0.95, duration: 50 }));
        clearBtn.on('pointerup', () => {
            this.tweens.add({ targets: clearBtn, scale: 1.0, duration: 100 });
            SoundManager.playTapSE();
            SoundManager.triggerHaptic(8);
            this.notes = [];
            this.updateNoteChips();
            this.updatePlayButtonBg();
        });
        clearBtn.on('pointerout', () => this.tweens.add({ targets: clearBtn, scale: 1.0, duration: 100 }));
    }

    updateNoteChips() {
        this.chipContainer.removeAll(true);
        this.noteCountLabel.setText(`♪ 入力した音符 (${this.notes.length}/${MAX_NOTES})`);

        const chipH = 24;
        const chipGap = 3;
        const padding = 14;
        const maxRowWidth = GAME_W - padding;
        let xPos = padding;
        let yPos = 0;

        this.notes.forEach((note, i) => {
            const color = NOTE_COLORS[note] || 0x888888;
            const name = NOTE_NAMES[note] || note;
            const chipW = Math.max(name.length * 9 + 10, 26);

            if (xPos + chipW > maxRowWidth && xPos > padding) {
                xPos = padding;
                yPos += chipH + chipGap;
            }

            const chip = this.add.graphics();
            chip.fillStyle(color, 1);
            chip.fillRoundedRect(xPos, yPos, chipW, chipH, 5);
            this.chipContainer.add(chip);

            const text = this.add.text(xPos + chipW / 2, yPos + chipH / 2, name, {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '11px',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5);
            this.chipContainer.add(text);

            xPos += chipW + chipGap;
        });

        const contentH = yPos + chipH;
        const visibleH = this.chipAreaH - 8;
        if (contentH > visibleH) {
            this.chipContainer.setY(this.chipAreaTop + 4 - (contentH - visibleH));
        } else {
            this.chipContainer.setY(this.chipAreaTop + 4);
        }
    }

    createInstrumentSelector() {
        const y = 330;
        this.add.text(30, y, '🎹 楽器選択:', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#888888',
        });

        const inst = INSTRUMENTS[this.selectedInstrument];
        const selectorBg = this.add.graphics();
        selectorBg.fillStyle(0x0d1b2a, 0.8);
        selectorBg.fillRoundedRect(30, y + 22, GAME_W - 60, 36, 8);
        selectorBg.lineStyle(1, 0x6bcb77, 0.3);
        selectorBg.strokeRoundedRect(30, y + 22, GAME_W - 60, 36, 8);

        this.instrumentText = this.add.text(42, y + 40, `${inst.icon} ${inst.name}`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
        }).setOrigin(0, 0.5);

        const arrow = this.add.text(GAME_W - 50, y + 40, '▼', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5);

        const selectorHitArea = this.add.rectangle(GAME_W / 2, y + 40, GAME_W - 60, 36);
        selectorHitArea.setInteractive({ useHandCursor: true });
        selectorHitArea.on('pointerup', () => {
            SoundManager.playTapSE();
            this.showInstrumentPicker();
        });
    }

    showInstrumentPicker() {
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, GAME_W, GAME_H);
        overlay.setDepth(200);
        overlay.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H),
            Phaser.Geom.Rectangle.Contains
        );

        const pickerElements = [overlay];

        const panelW = 340;
        const panelH = 520;
        const panelContainer = this.add.container(GAME_W / 2, GAME_H / 2);
        panelContainer.setDepth(201);
        pickerElements.push(panelContainer);

        const bg = this.add.graphics();
        bg.fillStyle(0x1e2a4a, 1);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
        panelContainer.add(bg);

        const title = this.add.text(0, -panelH / 2 + 30, '楽器を選択', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '22px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);
        panelContainer.add(title);

        const scrollContainer = this.add.container(0, 0);
        panelContainer.add(scrollContainer);

        let yPos = -panelH / 2 + 65;
        const instrumentKeys = Object.keys(INSTRUMENTS);
        let currentCategory = '';

        instrumentKeys.forEach((key) => {
            const inst = INSTRUMENTS[key];
            if (inst.category !== currentCategory) {
                currentCategory = inst.category;
                const catLabel = this.add.text(-panelW / 2 + 20, yPos,
                    INSTRUMENT_CATEGORIES[currentCategory] || currentCategory, {
                    fontFamily: 'KeiFont, sans-serif',
                    fontSize: '13px',
                    color: '#6bcb77',
                });
                scrollContainer.add(catLabel);
                yPos += 24;
            }

            const isSelected = key === this.selectedInstrument;
            const itemBg = this.add.graphics();
            if (isSelected) {
                itemBg.fillStyle(0x4d96ff, 0.3);
            }
            itemBg.fillRoundedRect(-panelW / 2 + 10, yPos - 2, panelW - 20, 28, 6);
            scrollContainer.add(itemBg);

            const itemText = this.add.text(-panelW / 2 + 22, yPos + 12,
                `${inst.icon} ${inst.name}`, {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '16px',
                color: isSelected ? '#4d96ff' : '#FFFFFF',
            }).setOrigin(0, 0.5);
            scrollContainer.add(itemText);

            const hitArea = this.add.rectangle(0, yPos + 12, panelW - 20, 28);
            hitArea.setInteractive({ useHandCursor: true });
            hitArea.on('pointerup', () => {
                this.selectedInstrument = key;
                const selInst = INSTRUMENTS[key];
                this.instrumentText.setText(`${selInst.icon} ${selInst.name}`);
                SoundManager.playDecideSE();
                this.audioLoaded = false;
                this.preloadCurrentOctaveAudio();
                cleanUp();
            });
            scrollContainer.add(hitArea);

            yPos += 30;
        });

        const contentHeight = yPos + panelH / 2 - 65;
        const visibleHeight = panelH - 95;
        let scrollY = 0;
        const maxScroll = Math.max(0, contentHeight - visibleHeight);

        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(GAME_W / 2 - panelW / 2, GAME_H / 2 - panelH / 2 + 60, panelW, visibleHeight);
        const mask = maskGraphics.createGeometryMask();
        scrollContainer.setMask(mask);

        let isDragging = false;
        let dragStart = 0;
        let dragScrollStart = 0;

        overlay.on('pointerdown', (pointer) => {
            isDragging = true;
            dragStart = pointer.y;
            dragScrollStart = scrollY;
        });
        overlay.on('pointermove', (pointer) => {
            if (!isDragging) return;
            const dy = dragStart - pointer.y;
            scrollY = Phaser.Math.Clamp(dragScrollStart + dy, 0, maxScroll);
            scrollContainer.setY(-scrollY);
        });

        const cleanUp = () => {
            pickerElements.forEach(el => { if (el && el.active) el.destroy(); });
            maskGraphics.destroy();
        };

        overlay.on('pointerup', (pointer) => {
            isDragging = false;
            if (Math.abs(pointer.y - dragStart) < 5) {
                cleanUp();
            }
        });

        panelContainer.setScale(0.9);
        panelContainer.setAlpha(0);
        this.tweens.add({
            targets: panelContainer,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut',
        });
    }

    createOctaveSelector() {
        const y = 400;
        this.add.text(GAME_W / 2, y, 'オクターブ', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5);

        this.octaveText = this.add.text(GAME_W / 2, y + 32, `${this.currentOctave}`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '28px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);

        // 矢印を大きくしてタップしやすく
        this.leftArrow = this.add.text(GAME_W / 2 - 65, y + 32, '◀', {
            fontSize: '28px',
            color: this.currentOctave > 2 ? '#4d96ff' : '#333333',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.leftArrow.on('pointerup', () => {
            if (this.currentOctave > 2) {
                this.currentOctave--;
                this.octaveText.setText(`${this.currentOctave}`);
                this.tweens.add({ targets: this.octaveText, scale: 1.2, duration: 50, yoyo: true });
                SoundManager.playTapSE();
                SoundManager.triggerHaptic(8);
                this.updateArrowColors();
                this.audioLoaded = false;
                this.preloadCurrentOctaveAudio();
            } else {
                // 限界時のブルブル演出
                this.tweens.add({
                    targets: this.leftArrow,
                    x: this.leftArrow.x - 3,
                    duration: 30,
                    yoyo: true,
                    repeat: 2,
                });
            }
        });

        this.rightArrow = this.add.text(GAME_W / 2 + 65, y + 32, '▶', {
            fontSize: '28px',
            color: this.currentOctave < 7 ? '#4d96ff' : '#333333',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.rightArrow.on('pointerup', () => {
            if (this.currentOctave < 7) {
                this.currentOctave++;
                this.octaveText.setText(`${this.currentOctave}`);
                this.tweens.add({ targets: this.octaveText, scale: 1.2, duration: 50, yoyo: true });
                SoundManager.playTapSE();
                SoundManager.triggerHaptic(8);
                this.updateArrowColors();
                this.audioLoaded = false;
                this.preloadCurrentOctaveAudio();
            } else {
                this.tweens.add({
                    targets: this.rightArrow,
                    x: this.rightArrow.x + 3,
                    duration: 30,
                    yoyo: true,
                    repeat: 2,
                });
            }
        });
    }

    updateArrowColors() {
        this.leftArrow.setColor(this.currentOctave > 2 ? '#4d96ff' : '#333333');
        this.rightArrow.setColor(this.currentOctave < 7 ? '#4d96ff' : '#333333');
    }

    createNoteButtons() {
        const startY = 485;
        const naturalNotes = CHROMATIC_NOTES.filter(n => !n.isSharp);
        const sharpNotes = CHROMATIC_NOTES.filter(n => n.isSharp);

        const naturalW = 46;
        const naturalH = 56;
        const naturalGap = 4;
        const totalNaturalW = naturalNotes.length * (naturalW + naturalGap) - naturalGap;
        const naturalStartX = (GAME_W - totalNaturalW) / 2;

        naturalNotes.forEach((note, i) => {
            const x = naturalStartX + i * (naturalW + naturalGap) + naturalW / 2;
            const noteId = `${note.id}${this.currentOctave}`;
            const color = NOTE_COLORS[noteId] || 0x888888;

            this.createNoteButton(x, startY, naturalW, naturalH, note.name, note.id, color);
        });

        const sharpW = 40;
        const sharpH = 48;
        const sharpY = startY + naturalH + 12;

        const sharpPositions = [0, 1, 3, 4, 5];
        sharpNotes.forEach((note, i) => {
            const baseIdx = sharpPositions[i];
            const x = naturalStartX + baseIdx * (naturalW + naturalGap) + naturalW + naturalGap / 2;
            const noteId = `${note.id}${this.currentOctave}`;
            const color = NOTE_COLORS[noteId] || 0x666666;

            this.createNoteButton(x, sharpY, sharpW, sharpH, note.name, note.id, color);
        });
    }

    createNoteButton(x, y, w, h, displayName, noteIdBase, color) {
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
        container.add(bg);

        const highlight = this.add.graphics();
        highlight.fillStyle(0xffffff, 0.2);
        highlight.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h / 2 - 3, 8);
        container.add(highlight);

        const fontSize = displayName.length > 2 ? '13px' : '16px';
        const label = this.add.text(0, 0, displayName, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: fontSize,
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5);
        container.add(label);

        container.setSize(w, h).setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            this.tweens.add({ targets: container, scale: 0.9, duration: 40 });
        });
        container.on('pointerup', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 80, ease: 'Back.easeOut' });
            const noteId = `${noteIdBase}${this.currentOctave}`;
            // 桜井イズム: ノートボタン押下時に対応する音を鳴らす（最重要改善）
            this.playNoteSound(noteId);
            SoundManager.triggerHaptic(8);
            this.addNote(noteId);

            // ボタンが光るフラッシュ
            const flash = this.add.graphics();
            flash.fillStyle(0xffffff, 0.4);
            flash.fillRoundedRect(container.x - w / 2, container.y - h / 2, w, h, 10);
            flash.setDepth(50);
            this.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 150,
                onComplete: () => flash.destroy(),
            });
        });
        container.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 80 });
        });
    }

    addNote(noteId) {
        if (this.notes.length >= MAX_NOTES) {
            SoundManager.playErrorSE();
            this.showToast(`最大${MAX_NOTES}音までです`);
            return;
        }
        this.notes.push(noteId);
        this.updateNoteChips();
        this.updatePlayButtonBg();
    }

    removeLastNote() {
        if (this.notes.length === 0) return;
        this.notes.pop();
        this.updateNoteChips();
        this.updatePlayButtonBg();
    }

    createBottomActions() {
        const y = GAME_H - 60;
        const btnW = 150;
        const btnH = 40;
        const gap = 16;

        const shareBtn = this.createActionButton(
            GAME_W / 2 - btnW / 2 - gap / 2, y,
            btnW, btnH, '共有コード生成', 0x4d96ff,
            () => this.generateShareCode()
        );

        const loadBtn = this.createActionButton(
            GAME_W / 2 + btnW / 2 + gap / 2, y,
            btnW, btnH, 'コード読み込み', 0x6bcb77,
            () => this.loadShareCode()
        );

        const saveBtn = this.createActionButton(
            GAME_W / 2, y - 50,
            180, btnH, '💾 ステージを保存', 0xa855f7,
            () => this.saveStage()
        );
    }

    createActionButton(x, y, w, h, text, color, callback) {
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(color, 0.85);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
        container.add(bg);

        const label = this.add.text(0, 0, text, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        container.add(label);

        container.setSize(w, h).setInteractive({ useHandCursor: true });
        container.on('pointerdown', () => this.tweens.add({ targets: container, scale: 0.95, duration: 50 }));
        container.on('pointerup', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
            SoundManager.playTapSE();
            SoundManager.triggerHaptic(8);
            callback();
        });
        container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1.0, duration: 100 }));

        return container;
    }

    generateShareCode() {
        if (this.notes.length < 3) {
            SoundManager.playErrorSE();
            this.showToast('3音以上入力してください');
            return;
        }

        const code = encodeStage({
            instrument: this.selectedInstrument,
            title: this.stageTitle,
            answer: this.notes,
        });

        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                SoundManager.playSuccessSE();
                this.showToast('コピーしました！');
            }).catch(() => {
                this.showInputModal('共有コード', code, () => {}, 500);
            });
        } else {
            this.showInputModal('共有コード', code, () => {}, 500);
        }
    }

    loadShareCode() {
        this.showInputModal('共有コードを入力', '', (code) => {
            if (!code) return;

            const data = decodeStage(code.trim());
            if (!data) {
                SoundManager.playErrorSE();
                this.showToast('無効なコードです');
                return;
            }

            SoundManager.playSuccessSE();
            this.notes = data.answer;
            this.selectedInstrument = data.instrument;
            this.stageTitle = data.title;

            const inst = INSTRUMENTS[this.selectedInstrument];
            this.instrumentText.setText(`${inst.icon} ${inst.name}`);
            this.titleText.setText(this.stageTitle);
            this.updateNoteChips();
            this.updatePlayButtonBg();
            this.audioLoaded = false;
            this.preloadCurrentOctaveAudio();

            this.showToast('読み込みました！');
        }, 500);
    }

    saveStage() {
        if (this.notes.length < 3) {
            SoundManager.playErrorSE();
            this.showToast('3音以上入力してください');
            return;
        }

        GameData.addCustomStage({
            title: this.stageTitle,
            instrument: this.selectedInstrument,
            answer: [...this.notes],
        });

        SoundManager.playSuccessSE();
        this.showToast(`「${this.stageTitle}」を保存しました！`);
    }

    playStage() {
        if (this.notes.length < 3) {
            SoundManager.playErrorSE();
            this.showToast('3音以上入力してください');
            return;
        }

        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            this.scene.start('GameScene', {
                source: 'editor',
                customStageData: {
                    title: this.stageTitle,
                    hint: 'エディタで作成',
                    instrument: this.selectedInstrument,
                    answer: [...this.notes],
                },
                editorState: {
                    notes: [...this.notes],
                    instrument: this.selectedInstrument,
                    octave: this.currentOctave,
                    title: this.stageTitle,
                },
            });
        });
    }

    showToast(message) {
        const toast = this.add.text(GAME_W / 2, GAME_H * 0.45, message, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
            backgroundColor: '#333333cc',
            padding: { x: 16, y: 8 },
        }).setOrigin(0.5).setDepth(500);

        toast.setScale(0);
        this.tweens.add({
            targets: toast,
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut',
        });
        this.tweens.add({
            targets: toast,
            alpha: 0,
            duration: 400,
            delay: 1200,
            onComplete: () => toast.destroy(),
        });
    }

    goBack() {
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            this.scene.start('MainMenuScene');
        });
    }
}
