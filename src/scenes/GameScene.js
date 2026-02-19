import Phaser from 'phaser';
import { GAME_W, GAME_H, SAFE, NOTE_COLORS, NOTE_NAMES, TEXT_STYLE, GRID, INSTRUMENTS, getAudioPath } from '../config.js';
import { STAGES, generateGrid } from '../data/stages.js';
import GameData from '../managers/GameData.js';
import AdManager from '../managers/AdManager.js';
import SoundManager from '../managers/SoundManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        // 起動元の記録（戻り先分岐用）
        this.source = (data && data.source) || 'select';
        this.editorState = (data && data.editorState) || null;

        // カスタムステージデータ（エディタ or カスタムステージから）
        if (data && data.customStageData) {
            this.stageKey = null;
            this.stageData = data.customStageData;
        } else {
            const stageKey = (data && data.stageKey) || 'twinkleStar';
            this.stageKey = stageKey;
            this.stageData = STAGES[stageKey];
        }
        
        // 楽器ID（フォールバック: piano）
        this.currentInstrument = this.stageData.instrument || 'piano';
        
        // グリッドを自動生成（正解の音階から一筆書き可能なマップを作成）
        const generated = generateGrid(this.stageData.answer, GRID.SIZE, this.currentInstrument);
        this.stage = {
            ...this.stageData,
            grid: generated.grid,
            solutionPath: generated.solutionPath,
        };
        
        console.log('Generated grid:', this.stage.grid);
        console.log('Solution path:', this.stage.solutionPath);
        
        // 一筆書き状態
        this.isDrawing = false;
        this.tracedPath = []; // なぞったセルのリスト [{row, col, note}]
        this.tracedNotes = []; // なぞった音階のリスト
        
        // グリッドセル参照
        this.cells = []; // 2D配列
        this.cellContainers = []; // フラットな配列
        
        // 線描画用
        this.lineGraphics = null;
        this.glowGraphics = null; // グロー用
        
        // エフェクト用
        this.effectsContainer = null;
        this.bgParticles = []; // 背景パーティクル
        
        // ゲーム状態
        this.gameEnded = false;
        this.comboCount = 0; // 連続正解カウント
        
        // 音声ロード状態
        this.audioLoaded = false;
        
        // ヒント再生状態
        this.isPlayingHint = false;
        this.hintTimers = []; // ヒント再生中のタイマー参照
        
        // [C2] ミスカウント（クリア評価用）
        this.missCount = 0;
        
        // [B1] 隣接セルハイライト
        this.adjacentHighlights = [];
        
        // [E2] 先端光点
        this.leadingDot = null;
        this.leadingDotTween = null;
        
        // [C3] 音符スロット
        this.noteSlots = [];
        
        // [E3] イントロ完了フラグ
        this.introComplete = false;
        
        // [A3] トレース番号バッジ
        this.traceBadges = [];
        
        // [C1] コンボカウンターUI
        this.comboCounterContainer = null;
        this.comboCounterText = null;
        this.comboCounterIcon = null;
    }

    create() {
        // 背景（グラデーション + パーティクル）
        this.createBackground();
        
        // エフェクト用コンテナ（セルより下に表示）
        this.effectsContainer = this.add.container(0, 0);
        this.effectsContainer.setDepth(0);
        
        // UI作成
        this.createHeader();
        this.createGrid();
        this.createComboCounter();
        this.createFooter();
        this.setupInput();
        
        // グロー描画レイヤー（線の下）
        this.glowGraphics = this.add.graphics();
        this.glowGraphics.setDepth(4);
        
        // 線描画レイヤー
        this.lineGraphics = this.add.graphics();
        this.lineGraphics.setDepth(5);
        
        // フェードイン
        this.cameras.main.fadeIn(300);
        
        // 背景パーティクルアニメーション開始
        this.startBackgroundParticles();
        
        // 音声の動的ロード（ステージに必要な音だけ）
        this.loadStageAudio();
        
        // [E3] イントロアニメーション
        this.playIntroAnimation();
    }
    
    /**
     * ステージに必要な楽器音声を動的にロードする
     * グリッド上の全ての音階（正解 + ダミー）を対象とする
     */
    loadStageAudio() {
        const instrument = this.currentInstrument;
        
        // グリッド上の全ノートを収集
        const notesToLoad = new Set();
        for (let row = 0; row < GRID.SIZE; row++) {
            for (let col = 0; col < GRID.SIZE; col++) {
                const note = this.stage.grid[row][col];
                if (note) {
                    notesToLoad.add(note);
                }
            }
        }
        
        // 動的に音声をロード
        let needsLoad = false;
        for (const noteId of notesToLoad) {
            const key = `${instrument}_${noteId}`;
            if (!this.cache.audio.exists(key)) {
                this.load.audio(key, getAudioPath(instrument, noteId));
                needsLoad = true;
            }
        }
        
        if (needsLoad) {
            // ロードエラー時は無音で続行
            this.load.on('loaderror', (file) => {
                console.warn(`Audio load failed: ${file.key} (${file.url}) - continuing without sound`);
            });
            
            this.load.once('complete', () => {
                this.audioLoaded = true;
                console.log(`Audio loaded for ${instrument}: ${notesToLoad.size} notes`);
            });
            
            this.load.start();
        } else {
            this.audioLoaded = true;
        }
    }
    
    /**
     * 楽器の音を再生する
     * @param {string} noteId - 音階ID（例: 'C4', 'Fs5'）
     */
    playNote(noteId) {
        const soundKey = `${this.currentInstrument}_${noteId}`;
        if (this.cache.audio.exists(soundKey)) {
            this.sound.play(soundKey, { volume: 0.7 });
        }
    }
    
    /**
     * グラデーション背景 + 星パーティクル
     */
    createBackground() {
        // グラデーション背景
        const bgGraphics = this.add.graphics();
        bgGraphics.setDepth(-10);
        
        // 縦グラデーション（深い青→紫）
        const steps = 20;
        for (let i = 0; i < steps; i++) {
            const ratio = i / steps;
            const r = Math.floor(26 + ratio * 20);  // 1a -> 2e
            const g = Math.floor(26 - ratio * 10);  // 1a -> 10
            const b = Math.floor(46 + ratio * 30);  // 2e -> 4c
            const color = (r << 16) | (g << 8) | b;
            
            bgGraphics.fillStyle(color, 1);
            bgGraphics.fillRect(0, (GAME_H / steps) * i, GAME_W, GAME_H / steps + 1);
        }
        
        // 装飾的な光の輪
        const colors = [0x4d96ff, 0xa855f7, 0xf472b6];
        for (let i = 0; i < 3; i++) {
            const x = GAME_W * (0.2 + i * 0.3);
            const y = GAME_H * (0.15 + Math.random() * 0.1);
            const circle = this.add.circle(x, y, 80 + i * 30, colors[i], 0.08);
            circle.setDepth(-9);
            
            // ゆっくり呼吸するアニメーション
            this.tweens.add({
                targets: circle,
                scale: { from: 1, to: 1.3 },
                alpha: { from: 0.08, to: 0.04 },
                duration: 3000 + i * 500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
        }
    }
    
    /**
     * 背景の星パーティクルを開始
     */
    startBackgroundParticles() {
        // 初期パーティクル生成
        for (let i = 0; i < 15; i++) {
            this.time.delayedCall(i * 200, () => {
                this.spawnBackgroundStar();
            });
        }
        
        // 定期的に新しい星を生成
        this.time.addEvent({
            delay: 800,
            callback: () => this.spawnBackgroundStar(),
            loop: true,
        });
    }
    
    /**
     * 背景の星を1つ生成
     */
    spawnBackgroundStar() {
        if (this.gameEnded) return;
        
        const x = Phaser.Math.Between(20, GAME_W - 20);
        const y = GAME_H + 20;
        const size = Phaser.Math.Between(2, 5);
        const colors = [0xffffff, 0xffd93d, 0x4d96ff, 0xa855f7];
        const color = colors[Phaser.Math.Between(0, colors.length - 1)];
        
        const star = this.add.star(x, y, 4, size / 2, size, color, 0.6);
        star.setDepth(-8);
        
        // 上に浮かぶアニメーション
        this.tweens.add({
            targets: star,
            y: -30,
            x: x + Phaser.Math.Between(-50, 50),
            rotation: Phaser.Math.FloatBetween(-2, 2),
            alpha: { from: 0.6, to: 0 },
            duration: Phaser.Math.Between(4000, 7000),
            ease: 'Linear',
            onComplete: () => star.destroy(),
        });
    }

    createHeader() {
        const headerY = SAFE.TOP + 30;
        
        // [D1] 戻るボタン
        this.createBackToStageButton();
        
        // ステージタイトル
        this.add.text(GAME_W / 2, headerY, this.stage.title, {
            ...TEXT_STYLE.title,
            fontSize: '32px',
        }).setOrigin(0.5);
    }
    
    /**
     * [D1] ゲーム中の戻るボタン
     */
    createBackToStageButton() {
        const btnY = SAFE.TOP + 30;
        
        const container = this.add.container(30, btnY);
        container.setDepth(20);
        
        // 背景
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.3);
        bg.fillRoundedRect(-18, -18, 36, 36, 10);
        container.add(bg);
        
        // 矢印テキスト
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
                this.navigateBack();
            });
        });
        
        container.on('pointerover', () => {
            this.tweens.add({ targets: container, scale: 1.1, duration: 100 });
        });
        container.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
        });
    }

    createGrid() {
        const gridSize = GRID.SIZE;
        const cellSize = GRID.CELL_SIZE;
        const gap = GRID.GAP;
        const totalSize = gridSize * cellSize + (gridSize - 1) * gap;
        
        // グリッド開始位置（中央配置）
        this.gridOffsetX = (GAME_W - totalSize) / 2;
        this.gridOffsetY = GAME_H * 0.32;
        
        // グリッド背景
        const bgPadding = 15;
        const gridBg = this.add.graphics();
        gridBg.fillStyle(0x16213e, 0.8);
        gridBg.fillRoundedRect(
            this.gridOffsetX - bgPadding,
            this.gridOffsetY - bgPadding,
            totalSize + bgPadding * 2,
            totalSize + bgPadding * 2,
            16
        );
        
        // セル作成
        this.cells = [];
        for (let row = 0; row < gridSize; row++) {
            this.cells[row] = [];
            for (let col = 0; col < gridSize; col++) {
                const note = this.stage.grid[row][col];
                const x = this.gridOffsetX + col * (cellSize + gap) + cellSize / 2;
                const y = this.gridOffsetY + row * (cellSize + gap) + cellSize / 2;
                
                const cell = this.createCell(x, y, cellSize, note, row, col);
                this.cells[row][col] = cell;
                if (cell) {
                    this.cellContainers.push(cell);
                }
            }
        }
    }

    /**
     * [C1] コンボカウンターを作成（グリッド右上に配置）
     */
    createComboCounter() {
        const gridSize = GRID.SIZE;
        const cellSize = GRID.CELL_SIZE;
        const gap = GRID.GAP;
        const totalSize = gridSize * cellSize + (gridSize - 1) * gap;
        
        const x = this.gridOffsetX + totalSize + 8;
        const y = this.gridOffsetY - 5;
        
        this.comboCounterContainer = this.add.container(x, y);
        this.comboCounterContainer.setDepth(20);
        this.comboCounterContainer.setAlpha(0); // 初期は非表示
        
        // 炎アイコン
        this.comboCounterIcon = this.add.text(0, 0, '🔥', {
            fontSize: '16px',
        }).setOrigin(0.5);
        this.comboCounterContainer.add(this.comboCounterIcon);
        
        // コンボ数
        this.comboCounterText = this.add.text(0, 20, '0', {
            fontSize: '18px',
            fontFamily: 'KeiFont, sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);
        this.comboCounterContainer.add(this.comboCounterText);
    }
    
    /**
     * [C1] コンボカウンターを更新
     */
    updateComboCounter() {
        if (!this.comboCounterContainer) return;
        
        if (this.comboCount <= 0) {
            // 非表示
            this.comboCounterContainer.setAlpha(0);
            return;
        }
        
        // 表示
        this.comboCounterContainer.setAlpha(1);
        this.comboCounterText.setText(`${this.comboCount}`);
        
        // コンボ数に応じた色変化
        let textColor;
        if (this.comboCount >= 9) {
            textColor = '#ffd93d'; // 金色
            this.comboCounterIcon.setText('🔥');
        } else if (this.comboCount >= 5) {
            textColor = '#ffbd69'; // オレンジ
            this.comboCounterIcon.setText('🔥');
        } else {
            textColor = '#ffffff'; // 白
            this.comboCounterIcon.setText('✦');
        }
        this.comboCounterText.setColor(textColor);
        
        // バウンスアニメーション
        this.tweens.killTweensOf(this.comboCounterContainer);
        this.comboCounterContainer.setScale(1);
        this.tweens.add({
            targets: this.comboCounterContainer,
            scale: { from: 1.4, to: 1.0 },
            duration: 200,
            ease: 'Back.easeOut',
        });
    }
    
    /**
     * [C1] コンボカウンターをリセット
     */
    resetComboCounter() {
        if (!this.comboCounterContainer) return;
        
        if (this.comboCount > 0) {
            // フェードアウト
            this.tweens.add({
                targets: this.comboCounterContainer,
                alpha: 0,
                scale: 0.5,
                duration: 200,
                ease: 'Cubic.easeIn',
            });
        } else {
            this.comboCounterContainer.setAlpha(0);
        }
    }

    /**
     * セルを作成する
     * [A1] スタートセル金色枠線
     * [A2] フォントサイズ段階制
     * [A5] 白ボーダーで輪郭強調
     */
    createCell(x, y, size, note, row, col) {
        if (!note) return null; // 空マス
        
        const container = this.add.container(x, y);
        container.setData('row', row);
        container.setData('col', col);
        container.setData('note', note);
        container.setData('traced', false);
        
        const color = NOTE_COLORS[note] || 0x888888;
        
        // スタート位置かどうか確認
        const isStart = this.stage.solutionPath && 
                        this.stage.solutionPath[0].row === row && 
                        this.stage.solutionPath[0].col === col;
        
        // [A1] スタート位置なら金色グロー効果
        if (isStart) {
            const glowSize = size + 20;
            const glow = this.add.graphics();
            glow.fillStyle(0xffd93d, 0.25);
            glow.fillCircle(0, 0, glowSize / 2);
            container.add(glow);
            container.setData('glow', glow);
            
            // グローのパルスアニメーション
            this.tweens.add({
                targets: glow,
                scale: { from: 0.8, to: 1.2 },
                alpha: { from: 0.25, to: 0.08 },
                duration: 1200,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
        }
        
        // セル背景（光沢効果付き）
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, 10);
        // 上部にハイライト
        bg.fillStyle(0xffffff, 0.25);
        bg.fillRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, (size - 8) / 2.5, 6);
        // [A5] 白ボーダーで輪郭を強調（明るく楽しげな雰囲気）
        bg.lineStyle(1, 0xffffff, 0.2);
        bg.strokeRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, 10);
        container.add(bg);
        container.setData('bg', bg);
        container.setData('color', color);
        
        // [A1] スタート位置なら金色枠（文字なし、枠線のみ）
        if (isStart) {
            const border = this.add.graphics();
            border.lineStyle(3, 0xffd93d, 0.9);
            border.strokeRoundedRect(-size / 2, -size / 2, size, size, 12);
            container.add(border);
            container.setData('startBorder', border);
            
            // パルスアニメーション（ゆっくり呼吸）
            this.tweens.add({
                targets: container,
                scale: { from: 1.0, to: 1.12 },
                duration: 800,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
        }
        
        // [A2] 音階名（フォントサイズ段階制でセル内に収める）
        const noteName = NOTE_NAMES[note];
        let fontSize;
        if (noteName.length <= 1) fontSize = '26px';
        else if (noteName.length <= 2) fontSize = '20px';
        else if (noteName.length <= 3) fontSize = '16px';
        else fontSize = '13px';
        
        const nameText = this.add.text(0, 0, noteName, {
            ...TEXT_STYLE.note,
            fontSize: fontSize,
        }).setOrigin(0.5);
        container.add(nameText);
        container.setData('noteText', nameText);
        
        container.setSize(size, size);
        container.setDepth(1);
        
        return container;
    }

    /**
     * [C3] スロット式フッター
     * 空スロットが並び、なぞるたびに色付きで埋まっていく
     */
    createFooter() {
        const answer = this.stage.answer;
        const totalSlots = answer.length;
        
        // スロットサイズ（音数に応じて調整）
        const slotSize = totalSlots <= 12 ? 20 : (totalSlots <= 14 ? 18 : 16);
        const maxTotalWidth = GAME_W - 60;
        const gapSize = Math.min(6, Math.max(2, Math.floor((maxTotalWidth - totalSlots * slotSize) / Math.max(1, totalSlots - 1))));
        const totalWidth = totalSlots * slotSize + (totalSlots - 1) * gapSize;
        const startX = (GAME_W - totalWidth) / 2 + slotSize / 2;
        
        const slotY = GAME_H - SAFE.BOTTOM - 150;
        
        // ラベル
        this.add.text(GAME_W / 2, slotY - 18, 'なぞった音:', {
            ...TEXT_STYLE.subtitle,
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5);
        
        // スロット作成
        this.noteSlots = [];
        for (let i = 0; i < totalSlots; i++) {
            const x = startX + i * (slotSize + gapSize);
            const slotContainer = this.add.container(x, slotY + 5);
            slotContainer.setDepth(20);
            
            // 空スロット背景
            const slotBg = this.add.graphics();
            slotBg.fillStyle(0xffffff, 0.1);
            slotBg.fillRoundedRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 4);
            slotBg.lineStyle(1, 0xffffff, 0.15);
            slotBg.strokeRoundedRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 4);
            slotContainer.add(slotBg);
            
            this.noteSlots.push({
                container: slotContainer,
                bg: slotBg,
                filled: false,
                size: slotSize,
            });
        }
        
        // テキスト表示（スロットの下に小さく）
        this.tracedDisplay = this.add.text(GAME_W / 2, slotY + 28, '', {
            ...TEXT_STYLE.subtitle,
            fontSize: '12px',
            color: '#aaaaaa',
            wordWrap: { width: GAME_W - 40 },
        }).setOrigin(0.5);
        
        // ボタンエリア（ヒント + リセットを横並び）
        const buttonY = GAME_H - SAFE.BOTTOM - 40;
        const buttonSpacing = 70; // ボタン間の距離
        this.createHintButton(GAME_W / 2 - buttonSpacing, buttonY);
        this.createResetButton(GAME_W / 2 + buttonSpacing, buttonY);
    }

    createHintButton(x, y) {
        const buttonW = 120;
        const buttonH = 40;
        
        const container = this.add.container(x, y);
        container.setDepth(20);
        
        // ボタン背景
        const bg = this.add.graphics();
        bg.fillStyle(0x4d96ff, 1);
        bg.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 10);
        // 上部ハイライト
        bg.fillStyle(0xffffff, 0.2);
        bg.fillRoundedRect(-buttonW / 2 + 2, -buttonH / 2 + 2, buttonW - 4, buttonH / 2.5, 8);
        container.add(bg);
        
        const label = this.add.text(0, 0, '♪ ヒント', {
            ...TEXT_STYLE.button,
            fontSize: '18px',
        }).setOrigin(0.5);
        container.add(label);
        
        container.setSize(buttonW, buttonH).setInteractive({ useHandCursor: true });
        
        // ホバーエフェクト
        container.on('pointerover', () => {
            if (!this.isPlayingHint) {
                this.tweens.add({
                    targets: container,
                    scale: 1.05,
                    duration: 100,
                    ease: 'Sine.easeOut',
                });
            }
        });
        
        container.on('pointerout', () => {
            if (!this.isPlayingHint) {
                this.tweens.add({
                    targets: container,
                    scale: 1.0,
                    duration: 100,
                    ease: 'Sine.easeOut',
                });
            }
        });
        
        container.on('pointerdown', () => {
            if (!this.isPlayingHint && !this.gameEnded && this.introComplete) {
                this.playHintMelody();
            }
        });
        
        this.hintButton = container;
        this.hintButtonBg = bg;
        this.hintButtonLabel = label;
    }
    
    /**
     * ヒントメロディを再生する
     * 正解の音階を順番に再生し、音符エフェクトを表示
     */
    playHintMelody() {
        if (this.isPlayingHint || !this.audioLoaded || !this.introComplete) return;
        
        // 再生中にリセットしておく
        if (this.tracedPath.length > 0) {
            this.resetTrace();
        }
        
        this.isPlayingHint = true;
        this.isDrawing = false;
        
        // ボタンを再生中状態にする
        this.setHintButtonPlaying(true);
        
        const answer = this.stage.answer;
        const noteInterval = 300; // 1音あたりの間隔（ms）
        
        // 各音を順番に再生
        for (let i = 0; i < answer.length; i++) {
            const timer = this.time.delayedCall(i * noteInterval, () => {
                const noteId = answer[i];
                
                // 音を再生
                this.playNote(noteId);
                
                // 音符が飛び出すエフェクト
                this.createHintNoteEffect(noteId, i, answer.length);
            });
            this.hintTimers.push(timer);
        }
        
        // 全音再生完了後
        const finishTimer = this.time.delayedCall(answer.length * noteInterval + 200, () => {
            this.isPlayingHint = false;
            this.hintTimers = [];
            this.setHintButtonPlaying(false);
        });
        this.hintTimers.push(finishTimer);
    }
    
    /**
     * ヒントボタンの再生中/通常状態を切り替え
     */
    setHintButtonPlaying(isPlaying) {
        const buttonW = 120;
        const buttonH = 40;
        
        if (isPlaying) {
            // 再生中: ボタンをパルスアニメーション
            this.hintButtonBg.clear();
            this.hintButtonBg.fillStyle(0xa855f7, 1);
            this.hintButtonBg.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 10);
            this.hintButtonBg.fillStyle(0xffffff, 0.2);
            this.hintButtonBg.fillRoundedRect(-buttonW / 2 + 2, -buttonH / 2 + 2, buttonW - 4, buttonH / 2.5, 8);
            
            this.hintButtonLabel.setText('♪ 再生中...');
            
            this.tweens.add({
                targets: this.hintButton,
                scale: { from: 1.0, to: 1.08 },
                duration: 400,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                key: 'hintPulse',
            });
        } else {
            // 通常状態に復帰
            this.tweens.killTweensOf(this.hintButton);
            this.hintButton.setScale(1.0);
            
            this.hintButtonBg.clear();
            this.hintButtonBg.fillStyle(0x4d96ff, 1);
            this.hintButtonBg.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 10);
            this.hintButtonBg.fillStyle(0xffffff, 0.2);
            this.hintButtonBg.fillRoundedRect(-buttonW / 2 + 2, -buttonH / 2 + 2, buttonW - 4, buttonH / 2.5, 8);
            
            this.hintButtonLabel.setText('♪ ヒント');
        }
    }
    
    /**
     * ヒント再生時の音符エフェクト
     * ボタンの上から音符が飛び出す + 波紋エフェクト
     */
    createHintNoteEffect(noteId, index, totalNotes) {
        const color = NOTE_COLORS[noteId] || 0xffffff;
        const noteName = NOTE_NAMES[noteId];
        
        // ヒントボタン位置を基準にエフェクト
        const baseX = this.hintButton.x;
        const baseY = this.hintButton.y - 30;
        
        // 音符テキストが浮き上がるエフェクト
        const noteText = this.add.text(baseX, baseY, noteName, {
            fontSize: '20px',
            fontFamily: 'KeiFont, sans-serif',
            color: '#' + color.toString(16).padStart(6, '0'),
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(55);
        
        // ランダムな横方向
        const driftX = Phaser.Math.Between(-40, 40);
        
        noteText.setScale(0);
        noteText.setAlpha(1);
        this.tweens.add({
            targets: noteText,
            scale: { from: 0.3, to: 1.2 },
            y: baseY - 60,
            x: baseX + driftX,
            alpha: { from: 1, to: 0 },
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => noteText.destroy(),
        });
        
        // 小さな波紋（ボタンから発生）
        const ring = this.add.circle(baseX, baseY + 15, 5, color, 0);
        ring.setStrokeStyle(2, color, 0.8);
        ring.setDepth(54);
        
        this.tweens.add({
            targets: ring,
            radius: 30,
            alpha: 0,
            duration: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy(),
        });
        
        // 小さなキラキラ
        for (let i = 0; i < 3; i++) {
            const sparkle = this.add.star(
                baseX + Phaser.Math.Between(-15, 15),
                baseY + Phaser.Math.Between(-5, 10),
                4, 1.5, 3, color, 0.8
            );
            sparkle.setDepth(55);
            
            this.tweens.add({
                targets: sparkle,
                y: sparkle.y - 25,
                alpha: 0,
                scale: 0,
                duration: 300,
                delay: i * 40,
                onComplete: () => sparkle.destroy(),
            });
        }
    }

    createResetButton(x, y) {
        const buttonW = 120;
        const buttonH = 40;
        
        const container = this.add.container(x, y);
        container.setDepth(20);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x444444, 1);
        bg.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 10);
        container.add(bg);
        
        const label = this.add.text(0, 0, 'リセット', {
            ...TEXT_STYLE.button,
            fontSize: '18px',
        }).setOrigin(0.5);
        container.add(label);
        
        container.setSize(buttonW, buttonH).setInteractive({ useHandCursor: true });
        
        container.on('pointerdown', () => {
            if (this.introComplete) {
                this.resetGame();
            }
        });
        
        this.resetButton = container;
    }

    setupInput() {
        // タッチ/マウス入力
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
    }

    onPointerDown(pointer) {
        if (this.gameEnded || this.isPlayingHint || !this.introComplete) return;
        
        const cell = this.getCellAtPosition(pointer.x, pointer.y);
        if (cell && !cell.getData('traced')) {
            this.isDrawing = true;
            this.traceCell(cell);
        }
    }

    onPointerMove(pointer) {
        if (!this.isDrawing || this.gameEnded || this.isPlayingHint || !this.introComplete) return;
        
        const cell = this.getCellAtPosition(pointer.x, pointer.y);
        if (cell && !cell.getData('traced')) {
            // 最後になぞったセルと隣接しているか確認
            if (this.isAdjacentToLast(cell)) {
                this.traceCell(cell);
            }
        }
        
        // [B1] 到達可能セルをハイライト
        this.updateAdjacentHighlights();
    }

    onPointerUp(pointer) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        // [B1] 隣接ハイライトをクリア
        this.clearAdjacentHighlights();
        
        // [E2] 先端光点を削除
        this.removeLeadingDot();
        
        // 判定
        this.checkAnswer();
    }

    getCellAtPosition(x, y) {
        for (const container of this.cellContainers) {
            if (!container) continue;
            
            const bounds = container.getBounds();
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                return container;
            }
        }
        return null;
    }

    isAdjacentToLast(cell) {
        if (this.tracedPath.length === 0) return true;
        
        const last = this.tracedPath[this.tracedPath.length - 1];
        const row = cell.getData('row');
        const col = cell.getData('col');
        
        const rowDiff = Math.abs(row - last.row);
        const colDiff = Math.abs(col - last.col);
        
        // 8方向隣接
        return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
    }

    traceCell(cell) {
        const row = cell.getData('row');
        const col = cell.getData('col');
        const note = cell.getData('note');
        
        // 状態更新
        cell.setData('traced', true);
        this.tracedPath.push({ row, col, note });
        this.tracedNotes.push(note);
        
        // 音声を再生
        this.playNote(note);
        
        // 正しい音階かチェック（進捗フィードバック用）
        const currentIndex = this.tracedNotes.length - 1;
        const isCorrectNote = this.stage.answer[currentIndex] === note;
        
        // 視覚的フィードバック
        this.highlightCell(cell);
        
        // 線を描画
        this.updateLine();
        
        // [C3] スロット＋テキスト表示更新
        this.updateTracedDisplay();
        
        // [B1] 隣接ハイライト更新
        if (this.isDrawing) {
            this.updateAdjacentHighlights();
        }
        
        // [E2] 先端光点更新
        this.updateLeadingDot();
        
        // 間違えた瞬間に即座に失敗判定（指を離さなくても失敗）
        if (!isCorrectNote) {
            this.isDrawing = false; // なぞりを停止
            this.clearAdjacentHighlights();
            this.removeLeadingDot();
            this.onWrongAnswer();
            return;
        }
        
        // 正解の場合のみコンボと褒め演出
        this.comboCount++;
        
        // [C1] コンボカウンター更新
        this.updateComboCounter();
        
        // 進捗に応じた褒め演出（桜井イズム：プレイヤーを褒める）
        this.showProgressFeedback(cell, isCorrectNote);
        
        // 全ての音階をなぞり終えたら自動的にクリア判定
        if (this.tracedNotes.length === this.stage.answer.length) {
            this.isDrawing = false;
            this.clearAdjacentHighlights();
            this.removeLeadingDot();
            this.onCorrectAnswer();
        }
    }
    
    /**
     * 進捗に応じたフィードバック表示（桜井イズム：プレイヤーを褒める）
     */
    showProgressFeedback(cell, isCorrect) {
        const x = cell.x;
        const y = cell.y - 40;
        
        // 一定数連続で正解の時、褒め演出
        if (isCorrect && this.comboCount > 0 && this.comboCount % 3 === 0) {
            const messages = ['いいね！', 'Great!', '♪', '調子いい！', 'Perfect!'];
            const message = messages[Math.floor(this.comboCount / 3 - 1) % messages.length];
            
            const feedbackText = this.add.text(x, y, message, {
                fontSize: '16px',
                fontFamily: 'KeiFont, sans-serif',
                color: '#ffd93d',
                stroke: '#000000',
                strokeThickness: 3,
            }).setOrigin(0.5).setDepth(50);
            
            // ポップアップアニメーション
            feedbackText.setScale(0);
            this.tweens.add({
                targets: feedbackText,
                scale: 1.2,
                y: y - 20,
                alpha: { from: 1, to: 0 },
                duration: 600,
                ease: 'Cubic.easeOut',
                onComplete: () => feedbackText.destroy(),
            });
            
            // コンボに応じた追加エフェクト
            if (this.comboCount >= 6) {
                this.createMiniSparkles(x, y + 20);
            }
        }
        
        // 半分到達時の特別演出
        const halfWay = Math.floor(this.stage.answer.length / 2);
        if (this.tracedNotes.length === halfWay && this.isCorrectSoFar()) {
            this.showMilestoneEffect('Half Way!');
        }
        
        // あと少しの時
        if (this.tracedNotes.length === this.stage.answer.length - 2 && this.isCorrectSoFar()) {
            this.showMilestoneEffect('あと少し！');
        }
    }
    
    /**
     * ここまで正解かチェック
     */
    isCorrectSoFar() {
        for (let i = 0; i < this.tracedNotes.length; i++) {
            if (this.tracedNotes[i] !== this.stage.answer[i]) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * 小さなキラキラエフェクト
     */
    createMiniSparkles(x, y) {
        for (let i = 0; i < 5; i++) {
            const sparkle = this.add.star(
                x + Phaser.Math.Between(-20, 20),
                y + Phaser.Math.Between(-10, 10),
                4, 2, 4, 0xffd93d, 1
            );
            sparkle.setDepth(51);
            
            this.tweens.add({
                targets: sparkle,
                y: sparkle.y - 30,
                alpha: 0,
                scale: 0,
                duration: 400,
                delay: i * 50,
                onComplete: () => sparkle.destroy(),
            });
        }
    }
    
    /**
     * マイルストーン到達演出
     */
    showMilestoneEffect(message) {
        const text = this.add.text(GAME_W / 2, GAME_H * 0.25, message, {
            fontSize: '24px',
            fontFamily: 'KeiFont, sans-serif',
            color: '#ffffff',
            stroke: '#4d96ff',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(60);
        
        text.setScale(0);
        this.tweens.add({
            targets: text,
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: text,
                    alpha: 0,
                    y: text.y - 30,
                    duration: 500,
                    delay: 300,
                    onComplete: () => text.destroy(),
                });
            }
        });
    }

    /**
     * セルハイライト
     * [E1] ハプティクスフィードバック追加
     */
    highlightCell(cell) {
        const size = GRID.CELL_SIZE;
        const x = cell.x;
        const y = cell.y;
        const note = cell.getData('note');
        const color = NOTE_COLORS[note];
        
        // スタートのグローを非表示
        const glow = cell.getData('glow');
        if (glow) {
            glow.setVisible(false);
        }
        
        // [E1] ハプティクスフィードバック（スマホの振動）
        SoundManager.triggerHaptic(10);
        
        // 音波リングエフェクト（桜井イズム：パリッとしたエフェクト）
        this.createRingEffect(x, y, color);
        
        // キラキラパーティクル
        this.createSparkles(x, y, color);
        
        // スケールアニメーション（より気持ちいい弾み）
        this.tweens.killTweensOf(cell); // 既存のtweenを停止
        cell.setScale(1);
        this.tweens.add({
            targets: cell,
            scale: 1.2,
            duration: 80,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: cell,
                    scale: 1.0,
                    duration: 150,
                    ease: 'Bounce.easeOut',
                });
            }
        });
        
        // 軽い画面振動（触感フィードバック）
        this.cameras.main.shake(30, 0.003);
        
        // 色を明るく（輝き効果）
        const bg = cell.getData('bg');
        bg.clear();
        // 外側の発光
        bg.fillStyle(0xffffff, 0.5);
        bg.fillRoundedRect(-size / 2 + 0, -size / 2 + 0, size, size, 12);
        // メインの色
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-size / 2 + 3, -size / 2 + 3, size - 6, size - 6, 10);
        // 強いハイライト
        bg.fillStyle(0xffffff, 0.4);
        bg.fillRoundedRect(-size / 2 + 5, -size / 2 + 5, size - 10, (size - 10) / 2.2, 6);
        
        // 音符を輝かせる
        const noteText = cell.getData('noteText');
        if (noteText) {
            this.tweens.add({
                targets: noteText,
                scale: 1.3,
                duration: 100,
                yoyo: true,
            });
        }
        
        cell.setDepth(10);
        
        // [A3] トレース番号バッジ（セル右下に小さく表示）
        const traceIndex = this.tracedPath.length;
        const badgeX = cell.x + size / 2 - 6;
        const badgeY = cell.y + size / 2 - 6;
        
        // バッジ背景（小さな丸）
        const badgeBg = this.add.circle(badgeX, badgeY, 8, 0x000000, 0.6);
        badgeBg.setDepth(11);
        
        const badgeText = this.add.text(badgeX, badgeY, `${traceIndex}`, {
            fontSize: '10px',
            fontFamily: 'KeiFont, sans-serif',
            color: '#ffffff',
        }).setOrigin(0.5).setDepth(12);
        
        // ポップイン
        badgeBg.setScale(0);
        badgeText.setScale(0);
        this.tweens.add({
            targets: [badgeBg, badgeText],
            scale: 1,
            duration: 150,
            delay: 80,
            ease: 'Back.easeOut',
        });
        
        this.traceBadges.push(badgeBg, badgeText);
    }
    
    /**
     * 音波リングエフェクト（桜井イズム：アタック強めの視覚表現）
     */
    createRingEffect(x, y, color) {
        // 複数のリングを生成
        for (let i = 0; i < 2; i++) {
            const ring = this.add.circle(x, y, 10, color, 0);
            ring.setStrokeStyle(4 - i, color, 1);
            ring.setDepth(15);
            
            this.tweens.add({
                targets: ring,
                radius: 60 + i * 20,
                alpha: 0,
                lineWidth: 1,
                duration: 300 + i * 100,
                delay: i * 50,
                ease: 'Cubic.easeOut',
                onComplete: () => ring.destroy(),
            });
        }
    }
    
    /**
     * キラキラパーティクルエフェクト
     */
    createSparkles(x, y, color) {
        const sparkleCount = 8;
        
        for (let i = 0; i < sparkleCount; i++) {
            const angle = (Math.PI * 2 / sparkleCount) * i + Math.random() * 0.3;
            const distance = 30 + Math.random() * 20;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            
            // 星形パーティクル
            const sparkle = this.add.star(x, y, 4, 2, 5, color, 1);
            sparkle.setDepth(16);
            
            this.tweens.add({
                targets: sparkle,
                x: targetX,
                y: targetY,
                scale: { from: 1, to: 0 },
                alpha: { from: 1, to: 0 },
                rotation: Math.random() * Math.PI,
                duration: 250 + Math.random() * 100,
                ease: 'Cubic.easeOut',
                onComplete: () => sparkle.destroy(),
            });
        }
    }

    updateLine() {
        this.lineGraphics.clear();
        this.glowGraphics.clear();
        
        if (this.tracedPath.length < 2) return;
        
        const cellSize = GRID.CELL_SIZE;
        const gap = GRID.GAP;
        
        // 座標を計算
        const points = this.tracedPath.map(({ row, col }) => ({
            x: this.gridOffsetX + col * (cellSize + gap) + cellSize / 2,
            y: this.gridOffsetY + row * (cellSize + gap) + cellSize / 2,
        }));
        
        // グロー効果（太い半透明の線を下に描画）
        for (let glow = 3; glow > 0; glow--) {
            this.glowGraphics.lineStyle(14 + glow * 4, 0xffffff, 0.08 * glow);
            this.glowGraphics.beginPath();
            
            for (let i = 0; i < points.length; i++) {
                if (i === 0) {
                    this.glowGraphics.moveTo(points[i].x, points[i].y);
                } else {
                    this.glowGraphics.lineTo(points[i].x, points[i].y);
                }
            }
            this.glowGraphics.strokePath();
        }
        
        // メインの線をセグメントごとに色付け（グラデーション効果）
        for (let i = 0; i < points.length - 1; i++) {
            const fromNote = this.tracedPath[i].note;
            const toNote = this.tracedPath[i + 1].note;
            const fromColor = NOTE_COLORS[fromNote] || 0xffffff;
            const toColor = NOTE_COLORS[toNote] || 0xffffff;
            
            // セグメントを複数の部分に分けてグラデーション表現
            const segments = 5;
            for (let s = 0; s < segments; s++) {
                const t1 = s / segments;
                const t2 = (s + 1) / segments;
                
                const x1 = points[i].x + (points[i + 1].x - points[i].x) * t1;
                const y1 = points[i].y + (points[i + 1].y - points[i].y) * t1;
                const x2 = points[i].x + (points[i + 1].x - points[i].x) * t2;
                const y2 = points[i].y + (points[i + 1].y - points[i].y) * t2;
                
                // 色を補間
                const color = this.lerpColor(fromColor, toColor, (t1 + t2) / 2);
                
                // 外側の白い縁取り
                this.lineGraphics.lineStyle(10, 0xffffff, 0.6);
                this.lineGraphics.beginPath();
                this.lineGraphics.moveTo(x1, y1);
                this.lineGraphics.lineTo(x2, y2);
                this.lineGraphics.strokePath();
                
                // メインのカラー線
                this.lineGraphics.lineStyle(6, color, 1);
                this.lineGraphics.beginPath();
                this.lineGraphics.moveTo(x1, y1);
                this.lineGraphics.lineTo(x2, y2);
                this.lineGraphics.strokePath();
            }
        }
        
        // 各ポイントに丸いノード
        for (let i = 0; i < points.length; i++) {
            const note = this.tracedPath[i].note;
            const color = NOTE_COLORS[note] || 0xffffff;
            
            // 白い縁取り
            this.lineGraphics.fillStyle(0xffffff, 0.9);
            this.lineGraphics.fillCircle(points[i].x, points[i].y, 7);
            
            // カラーの中心
            this.lineGraphics.fillStyle(color, 1);
            this.lineGraphics.fillCircle(points[i].x, points[i].y, 5);
        }
    }
    
    /**
     * 色の補間（線形補間）
     */
    lerpColor(color1, color2, t) {
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;
        
        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;
        
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        return (r << 16) | (g << 8) | b;
    }

    /**
     * [C3] なぞった音の表示を更新（スロット + テキスト）
     */
    updateTracedDisplay() {
        // テキスト表示
        const displayText = this.tracedNotes.map(n => NOTE_NAMES[n]).join(' ');
        this.tracedDisplay.setText(displayText);
        
        // スロット更新
        for (let i = 0; i < this.noteSlots.length; i++) {
            const slot = this.noteSlots[i];
            if (i < this.tracedNotes.length && !slot.filled) {
                slot.filled = true;
                const note = this.tracedNotes[i];
                const color = NOTE_COLORS[note] || 0xffffff;
                const sz = slot.size;
                
                // スロットを塗りつぶす
                slot.bg.clear();
                slot.bg.fillStyle(color, 0.9);
                slot.bg.fillRoundedRect(-sz / 2, -sz / 2, sz, sz, 4);
                slot.bg.lineStyle(1, 0xffffff, 0.4);
                slot.bg.strokeRoundedRect(-sz / 2, -sz / 2, sz, sz, 4);
                
                // ポップインアニメーション
                slot.container.setScale(0);
                this.tweens.add({
                    targets: slot.container,
                    scale: 1,
                    duration: 150,
                    ease: 'Back.easeOut',
                });
            }
        }
    }

    checkAnswer() {
        const answer = this.stage.answer;
        
        // 長さが足りない場合は静かにリセット（ミスにはカウントしない）
        if (this.tracedNotes.length !== answer.length) {
            if (this.tracedNotes.length > 0) {
                this.resetTrace();
            }
            return;
        }
        
        // 内容チェック（リアルタイム判定済みのため通常到達しない）
        for (let i = 0; i < answer.length; i++) {
            if (this.tracedNotes[i] !== answer[i]) {
                this.onWrongAnswer();
                return;
            }
        }
        
        // 正解！
        this.onCorrectAnswer();
    }

    /**
     * [C2] 正解時：メロディ再演奏 + 段階評価
     */
    onCorrectAnswer() {
        this.gameEnded = true;
        
        // クリア記録 + 星評価保存
        GameData.recordClear(this.stageKey);
        GameData.saveStageResult(this.stageKey, this.missCount);
        
        // 画面フラッシュ（桜井イズム：達成感の視覚的強調）
        this.createScreenFlash();
        
        // 経路が順番に光る演出 + メロディ再演奏
        this.playPathLightUpSequence();
        
        // 演出完了後にリザルト表示 + 広告判定
        const lightUpDuration = this.tracedPath.length * 100 + 400;
        this.time.delayedCall(Math.max(800, lightUpDuration), async () => {
            this.showResult(true);
            
            // 広告表示判定（リザルト表示後に非同期で実行）
            const adShown = await AdManager.onStageClear(this);
            if (adShown) {
                const goToShop = await AdManager.showRemoveAdPrompt(this);
                if (goToShop) {
                    this.scene.start('ShopScene');
                }
            }
        });
    }

    /**
     * [B2][B3][C2] 不正解時のフィードバック改善
     */
    onWrongAnswer() {
        // [C2] ミスカウント
        this.missCount++;
        
        // カメラシェイク（横揺れ）
        this.cameras.main.shake(200, 0.015);
        
        // セルを赤く光らせる
        this.flashCellsRed();
        
        // [B2] 間違えたセルと正解音を表示
        this.showWrongNoteFeedback();
        
        // [E1] 不正解時のハプティクス（長めの振動）
        SoundManager.triggerHapticPattern([30, 50, 30]);
        
        // [B3] 迅速なリトライ（0.4秒に短縮：桜井イズム「冷める前に操作を返す」）
        this.time.delayedCall(400, () => {
            this.resetTrace();
        });
    }
    
    /**
     * [B2] 間違えた箇所のフィードバック表示
     * 最後になぞったセルにバツマーク + 正解の音名を表示
     */
    showWrongNoteFeedback() {
        if (this.tracedPath.length === 0) return;
        
        const lastPath = this.tracedPath[this.tracedPath.length - 1];
        const cell = this.cells[lastPath.row][lastPath.col];
        if (!cell) return;
        
        const x = cell.x;
        const y = cell.y;
        const currentIndex = this.tracedNotes.length - 1;
        
        // バツマーク
        const xMark = this.add.text(x, y, '✕', {
            fontSize: '28px',
            fontFamily: 'KeiFont, sans-serif',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(25);
        
        this.tweens.add({
            targets: xMark,
            scale: { from: 0.5, to: 1.5 },
            alpha: { from: 1, to: 0 },
            y: y - 20,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => xMark.destroy(),
        });
        
        // 正解の音名を表示 + 正解音を鳴らす（桜井イズム：「正しくはこれだよ」と教える）
        if (currentIndex < this.stage.answer.length) {
            const correctNote = this.stage.answer[currentIndex];
            const correctName = NOTE_NAMES[correctNote];
            const correctColor = NOTE_COLORS[correctNote] || 0xffffff;
            
            // 正解の音を少し遅らせて鳴らす
            this.time.delayedCall(150, () => {
                this.playNote(correctNote);
            });
            
            const hint = this.add.text(x, y + 30, `→${correctName}`, {
                fontSize: '14px',
                fontFamily: 'KeiFont, sans-serif',
                color: '#' + correctColor.toString(16).padStart(6, '0'),
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5).setDepth(25);
            
            this.tweens.add({
                targets: hint,
                alpha: 0,
                y: hint.y + 10,
                duration: 600,
                delay: 200,
                onComplete: () => hint.destroy(),
            });
        }
    }
    
    /**
     * 画面フラッシュエフェクト
     */
    createScreenFlash() {
        const flash = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xffffff, 0.8);
        flash.setDepth(99);
        
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy(),
        });
    }
    
    /**
     * [C2] 経路が順番に光る演出 + メロディ再演奏
     */
    playPathLightUpSequence() {
        const noteInterval = 100; // メロディ再演奏の間隔
        
        this.tracedPath.forEach((pathItem, index) => {
            this.time.delayedCall(index * noteInterval, () => {
                const cell = this.cells[pathItem.row][pathItem.col];
                if (!cell) return;
                
                // メロディ再演奏
                this.playNote(pathItem.note);
                
                // 大きな光の輪を生成
                const x = cell.x;
                const y = cell.y;
                
                const ring = this.add.circle(x, y, 10, 0xffffff, 0.9);
                ring.setDepth(98);
                
                this.tweens.add({
                    targets: ring,
                    radius: 50,
                    alpha: 0,
                    duration: 300,
                    ease: 'Cubic.easeOut',
                    onComplete: () => ring.destroy(),
                });
                
                // セルを一瞬輝かせる
                this.tweens.add({
                    targets: cell,
                    scale: 1.3,
                    duration: 100,
                    yoyo: true,
                    ease: 'Quad.easeOut',
                });
            });
        });
    }
    
    /**
     * 不正解時にセルを赤く光らせる
     */
    flashCellsRed() {
        this.tracedPath.forEach((pathItem) => {
            const cell = this.cells[pathItem.row][pathItem.col];
            if (!cell) return;
            
            const flash = this.add.rectangle(cell.x, cell.y, GRID.CELL_SIZE, GRID.CELL_SIZE, 0xff0000, 0.5);
            flash.setDepth(20);
            
            this.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 300,
                onComplete: () => flash.destroy(),
            });
        });
    }

    /**
     * [C2] 段階的クリア評価（Perfect / Great / クリア）
     */
    showResult(isCorrect) {
        // 背景オーバーレイ
        const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0);
        overlay.setDepth(100);
        
        this.tweens.add({
            targets: overlay,
            fillAlpha: 0.75,
            duration: 300,
        });
        
        // [C2] ミス数に応じた評価テキスト
        let resultText, resultColor, subText;
        if (isCorrect) {
            if (this.missCount === 0) {
                resultText = 'Perfect!';
                resultColor = '#ffd93d';
                subText = '一度もミスなし！完璧な演奏！';
            } else if (this.missCount <= 2) {
                resultText = 'Great!';
                resultColor = '#74b9ff';
                subText = '素晴らしい演奏！';
            } else {
                resultText = 'クリア！';
                resultColor = '#6bcb77';
                subText = 'よくできました！';
            }
        } else {
            resultText = '失敗...';
            resultColor = '#ff6b6b';
            subText = '';
        }
        
        // 結果テキスト
        const text = this.add.text(GAME_W / 2, GAME_H * 0.4, resultText, {
            ...TEXT_STYLE.title,
            fontSize: '56px',
            color: resultColor,
        }).setOrigin(0.5).setDepth(101);
        
        // アニメーション（より派手に）
        text.setScale(0);
        text.setRotation(-0.1);
        this.tweens.add({
            targets: text,
            scale: 1,
            rotation: 0,
            duration: 400,
            ease: 'Back.easeOut',
        });
        
        if (isCorrect) {
            // サブテキスト（褒め演出：桜井イズム）
            const praiseText = this.add.text(GAME_W / 2, GAME_H * 0.48, subText, {
                ...TEXT_STYLE.subtitle,
                fontSize: '20px',
                color: '#ffffff',
            }).setOrigin(0.5).setDepth(101).setAlpha(0);
            
            this.tweens.add({
                targets: praiseText,
                alpha: 1,
                y: GAME_H * 0.47,
                duration: 400,
                delay: 300,
            });
            
            // 星のエフェクト
            this.createStarBurst(GAME_W / 2, GAME_H * 0.4);
            
            // パーティクル風エフェクト（より派手に）
            this.createConfetti();
            
            // 星評価を表示（全ランクで表示）
            this.createResultStars();
            
            // 桜井イズム: 迅速なリトライ - タップ促しを早く表示(800ms)
            this.time.delayedCall(800, () => {
                this.createResultButtons(overlay);
            });
        }
    }
    
    /**
     * 星評価の表示（Perfect=3つ、Great=2つ、Clear=1つ）
     */
    createResultStars() {
        let starCount;
        if (this.missCount === 0) starCount = 3;
        else if (this.missCount <= 2) starCount = 2;
        else starCount = 1;
        
        for (let i = 0; i < 3; i++) {
            const x = GAME_W / 2 + (i - 1) * 60;
            const y = GAME_H * 0.55;
            const filled = i < starCount;
            
            const star = this.add.star(x, y, 5, 10, 22, filled ? 0xffd93d : 0x555555, 1);
            star.setDepth(103);
            star.setScale(0);
            
            this.tweens.add({
                targets: star,
                scale: 1,
                rotation: filled ? Math.PI * 2 : 0,
                duration: 500,
                delay: 400 + i * 150,
                ease: 'Back.easeOut',
            });
            
            if (filled) {
                this.tweens.add({
                    targets: star,
                    alpha: { from: 1, to: 0.6 },
                    scale: { from: 1, to: 1.15 },
                    duration: 800,
                    delay: 900 + i * 150,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1,
                });
            }
        }
    }
    
    /**
     * 星の爆発エフェクト
     */
    createStarBurst(x, y) {
        const colors = [0xffd93d, 0xffffff, 0xf472b6];
        
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const distance = 80 + Math.random() * 40;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            const color = colors[i % colors.length];
            
            const star = this.add.star(x, y, 5, 4, 10, color, 1);
            star.setDepth(102);
            
            this.tweens.add({
                targets: star,
                x: targetX,
                y: targetY,
                scale: { from: 0.5, to: 1.5 },
                alpha: { from: 1, to: 0 },
                rotation: Math.random() * Math.PI * 2,
                duration: 600,
                ease: 'Cubic.easeOut',
                onComplete: () => star.destroy(),
            });
        }
    }

    createConfetti() {
        const colors = Object.values(NOTE_COLORS);
        
        // より多く、より派手に
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(30, GAME_W - 30);
            const y = -50;
            const color = colors[i % colors.length];
            const isSpecial = i % 5 === 0;
            
            // 星と円を混ぜる
            const particle = isSpecial 
                ? this.add.star(x, y, 5, 4, 10, color, 1)
                : this.add.circle(x, y, Phaser.Math.Between(4, 10), color);
            particle.setDepth(102);
            
            const targetY = GAME_H + 80;
            const drift = Phaser.Math.Between(-120, 120);
            const duration = Phaser.Math.Between(1800, 3500);
            
            this.tweens.add({
                targets: particle,
                y: targetY,
                x: x + drift,
                rotation: Phaser.Math.Between(0, 15),
                duration: duration,
                ease: 'Quad.easeIn',
                delay: i * 30,
                onComplete: () => particle.destroy(),
            });
            
            // 横に揺れる動き
            this.tweens.add({
                targets: particle,
                x: `+=${Phaser.Math.Between(-30, 30)}`,
                duration: 300,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: Math.floor(duration / 600),
                delay: i * 30,
            });
        }
    }

    createResultButtons(overlay) {
        // 「もう一度」ボタン（桜井イズム: 迅速なリトライ）
        const retryY = GAME_H * 0.68;
        const retryContainer = this.add.container(GAME_W / 2, retryY);
        retryContainer.setDepth(104);
        
        const retryBg = this.add.graphics();
        retryBg.fillStyle(0x4d96ff, 1);
        retryBg.fillRoundedRect(-80, -22, 160, 44, 12);
        retryBg.fillStyle(0xffffff, 0.2);
        retryBg.fillRoundedRect(-78, -20, 156, 20, 8);
        retryContainer.add(retryBg);
        
        const retryLabel = this.add.text(0, 0, '🔄 もう一度', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5);
        retryContainer.add(retryLabel);
        
        retryContainer.setSize(160, 44).setInteractive({ useHandCursor: true });
        retryContainer.on('pointerdown', () => {
            this.tweens.add({ targets: retryContainer, scale: 0.95, duration: 50 });
        });
        retryContainer.on('pointerup', () => {
            SoundManager.playDecideSE();
            SoundManager.triggerHaptic(12);
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.restart();
            });
        });
        
        retryContainer.setScale(0);
        this.tweens.add({
            targets: retryContainer,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut',
        });
        
        // 「ステージ選択に戻る」テキスト
        const backText = this.add.text(GAME_W / 2, retryY + 50, 'タップでステージ選択へ', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(104).setAlpha(0);
        
        this.tweens.add({
            targets: backText,
            alpha: 0.8,
            duration: 300,
            delay: 200,
        });
        
        // パルスアニメ
        this.tweens.add({
            targets: backText,
            alpha: { from: 0.8, to: 0.4 },
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            delay: 500,
        });
        
        // スペースキーで戻る
        this.input.keyboard.once('keydown-SPACE', () => {
            this.goToTitle();
        });
        
        // オーバーレイタップで戻る（ボタン以外の領域）
        overlay.setInteractive();
        overlay.once('pointerdown', () => {
            this.goToTitle();
        });
    }
    
    goToTitle() {
        SoundManager.playBackSE();
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            this.navigateBack();
        });
    }

    navigateBack() {
        if (this.source === 'editor' && this.editorState) {
            this.scene.start('StageEditorScene', this.editorState);
        } else {
            this.scene.start('StageSelectScene');
        }
    }

    /**
     * [B3] 波状リセット + スタートセル再発光
     * [A5] 白ボーダー復帰
     * [B1] 隣接ハイライトクリア
     * [C3] スロットリセット
     * [E2] 先端光点削除
     */
    resetTrace() {
        // ヒント再生中なら停止
        if (this.isPlayingHint) {
            this.hintTimers.forEach(timer => timer.remove(false));
            this.hintTimers = [];
            this.isPlayingHint = false;
            this.setHintButtonPlaying(false);
        }
        
        // [B1] 隣接ハイライトクリア
        this.clearAdjacentHighlights();
        
        // [E2] 先端光点削除
        this.removeLeadingDot();
        
        // [A3] トレース番号バッジを削除
        this.traceBadges.forEach(b => b.destroy());
        this.traceBadges = [];
        
        // [C1] コンボカウンターをリセット
        this.resetComboCounter();
        
        const size = GRID.CELL_SIZE;
        
        // なぞり状態リセット
        this.tracedPath = [];
        this.tracedNotes = [];
        this.comboCount = 0;
        
        // [B3] 波状にセルをリセット（端から順に）
        let waveIndex = 0;
        for (const container of this.cellContainers) {
            if (!container) continue;
            
            const note = container.getData('note');
            const color = container.getData('color') || NOTE_COLORS[note];
            const wasTraced = container.getData('traced');
            
            container.setData('traced', false);
            container.setData('adjacentTween', false);
            
            if (wasTraced) {
                const delay = waveIndex * 20;
                this.time.delayedCall(delay, () => {
                    this.tweens.killTweensOf(container);
                    
                    // 縮小→復帰アニメーション
                    this.tweens.add({
                        targets: container,
                        scale: { from: 0.85, to: 1 },
                        duration: 200,
                        ease: 'Back.easeOut',
                    });
                    
                    container.setDepth(1);
                    
                    // 背景を元に戻す（[A5] 白ボーダー付き）
                    const bg = container.getData('bg');
                    bg.clear();
                    bg.fillStyle(color, 1);
                    bg.fillRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, 10);
                    bg.fillStyle(0xffffff, 0.25);
                    bg.fillRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, (size - 8) / 2.5, 6);
                    bg.lineStyle(1, 0xffffff, 0.2);
                    bg.strokeRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, 10);
                    
                    // スタート位置のグローを復活
                    const glow = container.getData('glow');
                    if (glow) {
                        glow.setVisible(true);
                        this.tweens.add({
                            targets: container,
                            scale: { from: 1.0, to: 1.12 },
                            duration: 800,
                            ease: 'Sine.easeInOut',
                            yoyo: true,
                            repeat: -1,
                        });
                    }
                });
                waveIndex++;
            } else {
                // なぞられていないセルはそのまま復帰
                this.tweens.killTweensOf(container);
                container.setScale(1);
                container.setDepth(1);
                
                const glow = container.getData('glow');
                if (glow) {
                    glow.setVisible(true);
                    this.tweens.add({
                        targets: container,
                        scale: { from: 1.0, to: 1.12 },
                        duration: 800,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1,
                    });
                }
            }
        }
        
        // 線クリア
        this.lineGraphics.clear();
        this.glowGraphics.clear();
        
        // [C3] スロットリセット
        this.resetNoteSlots();
        
        // テキスト表示更新
        this.tracedDisplay.setText('');
        
        // [B3] 全リセット後にスタートセルを金色リングで強調
        const totalResetTime = waveIndex * 20 + 250;
        this.time.delayedCall(totalResetTime, () => {
            const startPath = this.stage.solutionPath[0];
            if (startPath) {
                const startCell = this.cells[startPath.row][startPath.col];
                if (startCell) {
                    const ring = this.add.circle(startCell.x, startCell.y, 5, 0xffd93d, 0.7);
                    ring.setDepth(15);
                    this.tweens.add({
                        targets: ring,
                        radius: 40,
                        alpha: 0,
                        duration: 400,
                        ease: 'Cubic.easeOut',
                        onComplete: () => ring.destroy(),
                    });
                }
            }
        });
    }
    
    /**
     * [C3] 音符スロットのリセット
     */
    resetNoteSlots() {
        for (let i = 0; i < this.noteSlots.length; i++) {
            const slot = this.noteSlots[i];
            slot.filled = false;
            slot.container.setScale(1);
            
            const sz = slot.size;
            slot.bg.clear();
            slot.bg.fillStyle(0xffffff, 0.1);
            slot.bg.fillRoundedRect(-sz / 2, -sz / 2, sz, sz, 4);
            slot.bg.lineStyle(1, 0xffffff, 0.15);
            slot.bg.strokeRoundedRect(-sz / 2, -sz / 2, sz, sz, 4);
        }
    }

    resetGame() {
        if (this.gameEnded) {
            // ゲーム終了後のリセットはシーン再起動
            this.scene.restart();
        } else {
            this.resetTrace();
        }
    }
    
    // ================================================================
    // [B1] 到達可能セルのハイライト
    // ================================================================
    
    /**
     * なぞり中に到達可能な隣接セルをハイライト表示
     * 桜井イズム：「無反応を避ける」= どこに行けるか視覚的に示す
     */
    updateAdjacentHighlights() {
        this.clearAdjacentHighlights();
        
        if (this.tracedPath.length === 0) return;
        
        const last = this.tracedPath[this.tracedPath.length - 1];
        const size = GRID.CELL_SIZE;
        
        // まず隣接セルのセットを作成
        const adjacentSet = new Set();
        
        for (const container of this.cellContainers) {
            if (!container || container.getData('traced')) continue;
            
            const row = container.getData('row');
            const col = container.getData('col');
            const rowDiff = Math.abs(row - last.row);
            const colDiff = Math.abs(col - last.col);
            
            if (rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0)) {
                adjacentSet.add(container);
            }
        }
        
        for (const container of this.cellContainers) {
            if (!container || container.getData('traced')) continue;
            
            if (adjacentSet.has(container)) {
                // [B1] 隣接セルを微かにハイライト
                const highlight = this.add.graphics();
                highlight.lineStyle(2, 0xffffff, 0.4);
                highlight.strokeRoundedRect(
                    container.x - size / 2 + 1,
                    container.y - size / 2 + 1,
                    size - 2, size - 2, 10
                );
                highlight.setDepth(2);
                this.adjacentHighlights.push(highlight);
                
                // 隣接セルはフル表示
                container.setAlpha(1.0);
                
                // 微かなスケールアップ
                if (!container.getData('adjacentTween')) {
                    container.setData('adjacentTween', true);
                    this.tweens.add({
                        targets: container,
                        scale: 1.05,
                        duration: 150,
                        ease: 'Sine.easeOut',
                    });
                }
            }
        }
    }
    
    /**
     * 隣接ハイライトをクリア
     */
    clearAdjacentHighlights() {
        this.adjacentHighlights.forEach(h => h.destroy());
        this.adjacentHighlights = [];
        
        // スケールを戻す
        for (const container of this.cellContainers) {
            if (!container || container.getData('traced')) continue;
            
            if (container.getData('adjacentTween')) {
                container.setData('adjacentTween', false);
                const glow = container.getData('glow');
                if (!glow) { // スタートセルは独自のスケールtweenを持つので除外
                    this.tweens.add({
                        targets: container,
                        scale: 1.0,
                        duration: 100,
                        ease: 'Sine.easeOut',
                    });
                }
            }
        }
    }
    
    // ================================================================
    // [E2] 先端光点パーティクル
    // ================================================================
    
    /**
     * パスの先端にパルスする光点を表示
     */
    updateLeadingDot() {
        this.removeLeadingDot();
        
        if (this.tracedPath.length === 0) return;
        
        const last = this.tracedPath[this.tracedPath.length - 1];
        const cellSize = GRID.CELL_SIZE;
        const gap = GRID.GAP;
        const x = this.gridOffsetX + last.col * (cellSize + gap) + cellSize / 2;
        const y = this.gridOffsetY + last.row * (cellSize + gap) + cellSize / 2;
        
        // 光点
        this.leadingDot = this.add.circle(x, y, 4, 0xffffff, 0.9);
        this.leadingDot.setDepth(6);
        
        this.leadingDotTween = this.tweens.add({
            targets: this.leadingDot,
            scale: { from: 0.8, to: 1.8 },
            alpha: { from: 0.9, to: 0.3 },
            duration: 400,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });
    }
    
    /**
     * 先端光点を削除
     */
    removeLeadingDot() {
        if (this.leadingDot) {
            if (this.leadingDotTween) {
                this.leadingDotTween.stop();
                this.leadingDotTween = null;
            }
            this.leadingDot.destroy();
            this.leadingDot = null;
        }
    }
    
    // ================================================================
    // [E3] イントロアニメーション
    // ================================================================
    
    /**
     * ゲーム開始時のセル落下イントロ演出
     * セルが上から順番に落下し、全着地後にスタートセルが光る
     */
    playIntroAnimation() {
        const gridSize = GRID.SIZE;
        
        // 全セルのtweenを停止し、初期状態を設定
        for (const container of this.cellContainers) {
            if (!container) continue;
            this.tweens.killTweensOf(container);
            
            const glow = container.getData('glow');
            if (glow) {
                this.tweens.killTweensOf(glow);
                glow.setAlpha(0);
            }
            
            const originalY = container.y;
            container.setData('originalY', originalY);
            container.y = originalY - 80;
            container.setAlpha(0);
            container.setScale(0.5);
        }
        
        // 行ごとに落下アニメーション
        let maxDelay = 0;
        this.introTweens = [];
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cell = this.cells[row] && this.cells[row][col];
                if (!cell) continue;
                
                const originalY = cell.getData('originalY');
                const cellDelay = 200 + (row * gridSize + col) * 30;
                maxDelay = Math.max(maxDelay, cellDelay);
                
                const tw = this.tweens.add({
                    targets: cell,
                    y: originalY,
                    alpha: 1,
                    scale: 1.0,
                    duration: 300,
                    delay: cellDelay,
                    ease: 'Back.easeOut',
                });
                this.introTweens.push(tw);
            }
        }
        
        // タップでスキップ可能（桜井イズム: 迅速なリトライ）
        const skipHandler = () => {
            if (this.introComplete) return;
            this.skipIntro();
        };
        this.input.once('pointerdown', skipHandler);
        
        // 全セル着地後にスタートセルを光らせる
        this.introFinishTimer = this.time.delayedCall(maxDelay + 350, () => {
            this.input.off('pointerdown', skipHandler);
            this.finishIntro();
        });
    }
    
    /** イントロをスキップ */
    skipIntro() {
        if (this.introComplete) return;
        
        // 全てのイントロtweenを即座に完了
        if (this.introTweens) {
            this.introTweens.forEach(tw => {
                if (tw && tw.isPlaying()) tw.complete();
            });
            this.introTweens = [];
        }
        if (this.introFinishTimer) {
            this.introFinishTimer.remove(false);
        }
        
        // 全セルを最終位置に配置
        for (const container of this.cellContainers) {
            if (!container) continue;
            const originalY = container.getData('originalY');
            if (originalY !== undefined) {
                container.y = originalY;
                container.setAlpha(1);
                container.setScale(1);
            }
        }
        
        this.finishIntro();
    }
    
    /** イントロ完了処理 */
    finishIntro() {
        if (this.introComplete) return;
        this.introComplete = true;
        
        const startPath = this.stage.solutionPath[0];
        if (startPath) {
            const startCell = this.cells[startPath.row][startPath.col];
            if (startCell) {
                const glow = startCell.getData('glow');
                if (glow) {
                    glow.setAlpha(1);
                    this.tweens.add({
                        targets: glow,
                        scale: { from: 0.8, to: 1.2 },
                        alpha: { from: 0.25, to: 0.08 },
                        duration: 1200,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1,
                    });
                }
                
                this.tweens.add({
                    targets: startCell,
                    scale: { from: 1.0, to: 1.12 },
                    duration: 800,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1,
                });
                
                const ring = this.add.circle(startCell.x, startCell.y, 5, 0xffd93d, 0.8);
                ring.setDepth(15);
                this.tweens.add({
                    targets: ring,
                    radius: 50,
                    alpha: 0,
                    duration: 500,
                    ease: 'Cubic.easeOut',
                    onComplete: () => ring.destroy(),
                });
            }
        }
    }
}
