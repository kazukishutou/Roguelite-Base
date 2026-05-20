const survivors = [
  { id: 1, name: 'ケンジ', maxHp: 30, hp: 30, attack: 6, explore: 4, courage: 6, caution: 4, luck: 3, personality: '無謀', level: 1, exp: 0, state: '健康', color: 0xff7364 },
  { id: 2, name: 'ミカ', maxHp: 24, hp: 24, attack: 4, explore: 7, courage: 5, caution: 6, luck: 5, personality: '仲間思い', level: 1, exp: 0, state: '健康', color: 0x65c8ff },
  { id: 3, name: 'ゴロー', maxHp: 36, hp: 36, attack: 8, explore: 2, courage: 7, caution: 2, luck: 2, personality: '短気', level: 1, exp: 0, state: '健康', color: 0xffc05d },
  { id: 4, name: 'リナ', maxHp: 22, hp: 22, attack: 3, explore: 8, courage: 4, caution: 7, luck: 6, personality: '慎重', level: 1, exp: 0, state: '健康', color: 0xa3ff91 },
  { id: 5, name: 'ヤス', maxHp: 26, hp: 26, attack: 5, explore: 5, courage: 4, caution: 5, luck: 8, personality: '強運', level: 1, exp: 0, state: '健康', color: 0xd77dff }
];

const enemyTypes = [
  { name: 'ゾンビ', strength: 6, color: 0x7f8c8d },
  { name: '野犬', strength: 8, color: 0xe67e22 },
  { name: '略奪者', strength: 10, color: 0xc0392b }
];

const supplyItems = ['食料', '薬', '弾薬', '燃料', 'ガラクタ'];
const gearItems = [
  { name: '錆びたナイフ', rarity: 'common' },
  { name: '木製バット', rarity: 'common' },
  { name: '古い拳銃', rarity: 'rare' },
  { name: '防弾ベスト', rarity: 'rare' },
  { name: 'ショットガン', rarity: 'rare' }
];

const supplies = {
  食料: 0,
  薬: 0,
  弾薬: 0,
  燃料: 0,
  ガラクタ: 0
};
const gearInventory = [];
const selectedIds = [];
const eventLog = [];

const ui = {
  survivorList: document.getElementById('survivorList'),
  selectedStatus: document.getElementById('selected-status'),
  supplyList: document.getElementById('supplyList'),
  gearList: document.getElementById('gearList'),
  eventLog: document.getElementById('eventLog'),
  startButton: document.getElementById('startButton'),
  nextButton: document.getElementById('nextButton')
};

let gameScene;
let game;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getStateLabel(char) {
  if (char.hp <= 0) return '重傷';
  if (char.hp <= Math.max(1, Math.floor(char.maxHp * 0.4))) return '負傷';
  return '健康';
}

function updateStates() {
  survivors.forEach(char => {
    char.state = getStateLabel(char);
  });
}

function formatHp(char) {
  return `${Math.max(0, char.hp)}/${char.maxHp}`;
}

function addLog(message, rare = false) {
  const stamp = `【${new Date().toLocaleTimeString('ja-JP', { hour12: false })}】 `;
  eventLog.push({ text: stamp + message, rare });
  if (eventLog.length > 20) eventLog.shift();
  renderLog();
}

function renderLog() {
  ui.eventLog.innerHTML = '';
  for (let i = eventLog.length - 1; i >= 0; i--) {
    const item = eventLog[i];
    const entry = document.createElement('div');
    entry.className = 'log-entry' + (item.rare ? ' rare' : '');
    entry.textContent = item.text;
    ui.eventLog.appendChild(entry);
  }
}

function renderSupplies() {
  ui.supplyList.innerHTML = '';
  Object.keys(supplies).forEach(name => {
    const el = document.createElement('div');
    el.className = 'item-entry';
    el.innerHTML = `<h3>${name}</h3><p>所持: ${supplies[name]}</p>`;
    ui.supplyList.appendChild(el);
  });
}

function renderGear() {
  ui.gearList.innerHTML = '';
  if (gearInventory.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'item-entry';
    empty.textContent = '装備なし';
    ui.gearList.appendChild(empty);
    return;
  }
  gearInventory.forEach(item => {
    const el = document.createElement('div');
    el.className = 'item-entry';
    el.innerHTML = `<h3>${item.name}</h3><p>希少度: ${item.rarity === 'rare' ? 'レア' : '普通'}</p>`;
    ui.gearList.appendChild(el);
  });
}

function renderSelectedStatus() {
  ui.selectedStatus.innerHTML = '';
  if (selectedIds.length === 0) {
    ui.selectedStatus.textContent = '遠征メンバーが選択されていません。';
    return;
  }
  selectedIds.forEach(id => {
    const char = survivors.find(entry => entry.id === id);
    if (!char) return;
    const card = document.createElement('div');
    card.className = 'status-item';
    card.innerHTML = `
      <h3>${char.name} (${char.personality})</h3>
      <p>HP: ${formatHp(char)}</p>
      <p>Lv ${char.level} / Exp ${char.exp}/10</p>
      <p>攻撃 ${char.attack} / 探索 ${char.explore} / 運 ${char.luck}</p>
      <p>状態: ${char.state}</p>
    `;
    ui.selectedStatus.appendChild(card);
  });
}

function renderSurvivorList() {
  ui.survivorList.innerHTML = '';
  survivors.forEach(char => {
    const entry = document.createElement('div');
    const isSelected = selectedIds.includes(char.id);
    entry.className = 'survivor-entry' + (isSelected ? ' selected' : '');
    if (char.state === '重傷') entry.classList.add('disabled');
    entry.innerHTML = `
      <h3>${char.name} <small>${char.personality}</small></h3>
      <p>HP ${formatHp(char)} / Lv ${char.level} / Exp ${char.exp}/10</p>
      <p>攻 ${char.attack} / 探索 ${char.explore} / 運 ${char.luck}</p>
      <p>状態: ${char.state}</p>
    `;
    if (char.state !== '重傷') {
      entry.addEventListener('click', () => toggleSelection(char.id));
    }
    ui.survivorList.appendChild(entry);
  });
}

function updateUiState() {
  renderSurvivorList();
  renderSelectedStatus();
  renderSupplies();
  renderGear();
  renderLog();
  ui.startButton.disabled = selectedIds.length === 0 || (gameScene && gameScene.isActive);
  ui.nextButton.disabled = gameScene && gameScene.isActive;
}

function toggleSelection(id) {
  if (gameScene && gameScene.isActive) return;
  const char = survivors.find(entry => entry.id === id);
  if (!char || char.state === '重傷') return;
  const index = selectedIds.indexOf(id);
  if (index !== -1) {
    selectedIds.splice(index, 1);
  } else if (selectedIds.length < 3) {
    selectedIds.push(id);
  }
  updateUiState();
}

function chooseRandom(sorted) {
  return sorted[Math.floor(Math.random() * sorted.length)];
}

function getSelectedChars() {
  return selectedIds.map(id => survivors.find(char => char.id === id)).filter(Boolean);
}

function createGame() {
  const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    parent: 'game-container',
    backgroundColor: '#111111',
    scene: [GameScene]
  };
  game = new Phaser.Game(config);
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.isActive = false;
    this.isPaused = false;
    this.phase = 'idle';
    this.eventTimer = 0;
    this.pauseTimer = 0;
    this.returnDelay = 0;
    this.partySprites = [];
    this.eventHint = null;
    this.currentEvent = null;
  }

  create() {
    gameScene = this;
    this.drawStage();
    this.eventHint = this.add.text(480, 15, '', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5, 0);
  }

  drawStage() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(0, 0, 960, 540);

    graphics.fillStyle(0x222222, 1);
    graphics.fillRect(20, 60, 260, 460);
    graphics.fillRect(680, 60, 260, 460);

    graphics.lineStyle(6, 0x7f8c8d, 1);
    graphics.strokeRect(20, 60, 260, 460);
    graphics.strokeRect(680, 60, 260, 460);

    graphics.lineStyle(4, 0x999999, 1);
    graphics.beginPath();
    graphics.moveTo(280, 110);
    graphics.lineTo(680, 110);
    graphics.strokePath();
    graphics.beginPath();
    graphics.moveTo(280, 430);
    graphics.lineTo(680, 430);
    graphics.strokePath();

    const route = this.add.rectangle(480, 275, 560, 260, 0x2f2f2f).setStrokeStyle(2, 0x707070);
    route.setOrigin(0.5, 0.5);

    this.add.text(40, 70, '拠点', { fontFamily: 'sans-serif', fontSize: '20px', color: '#f1c40f' });
    this.add.text(700, 70, '廃墟', { fontFamily: 'sans-serif', fontSize: '20px', color: '#e74c3c' });
    this.add.text(480, 90, '遠征ルート', { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5, 0);
  }

  startExpedition() {
    if (this.isActive || selectedIds.length === 0) return;
    const party = getSelectedChars();
    if (party.length === 0) return;

    this.clearParty();
    this.isActive = true;
    this.phase = 'going';
    this.isPaused = false;
    this.eventTimer = 1.8;
    this.returnDelay = 0;
    this.currentEvent = null;

    const startY = 180;
    party.forEach((char, index) => {
      const x = 140;
      const y = startY + index * 100;
      const sprite = this.add.container(x, y);
      sprite.baseY = y;
      const body = this.add.circle(0, 0, 18, char.color);
      const head = this.add.circle(0, -12, 8, 0xffffff);
      const label = this.add.text(0, 24, char.name, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff'
      }).setOrigin(0.5, 0);
      sprite.add([body, head, label]);
      sprite.charId = char.id;
      this.partySprites.push(sprite);
    });

    addLog(`遠征隊が拠点を出発した。3人の影が廃墟へ向かって進む。`);
    updateUiState();
  }

  clearParty() {
    this.partySprites.forEach(sprite => sprite.destroy());
    this.partySprites = [];
  }

  update(time, delta) {
    if (!this.isActive) return;
    const dt = delta / 1000;
    if (this.isPaused) {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.isPaused = false;
        this.currentEvent = null;
        this.eventHint.setText('');
      }
      return;
    }

    if (this.phase === 'going') {
      this.partySprites.forEach((sprite, index) => {
        const wave = Math.sin(time / 250 + index) * 3;
        sprite.x += 70 * dt;
        sprite.y = sprite.baseY + wave;
      });

      if (this.partySprites[0].x >= 620) {
        this.phase = 'atDestination';
        this.returnDelay = 2.0;
        addLog(`遠征隊は廃墟の一角に到達した。しばらく略奪と探索を続ける。`);
      }

      this.eventTimer -= dt;
      if (this.eventTimer <= 0 && !this.currentEvent) {
        this.triggerRandomEvent();
      }
    }

    if (this.phase === 'atDestination') {
      this.returnDelay -= dt;
      if (this.returnDelay <= 0) {
        this.phase = 'returning';
        addLog('遠征の収穫を抱えて、帰路につく。');
      }
    }

    if (this.phase === 'returning') {
      this.partySprites.forEach((sprite, index) => {
        const wave = Math.sin(time / 250 + index) * 3;
        sprite.x -= 80 * dt;
        sprite.y = sprite.baseY + wave;
      });
      if (this.partySprites[0].x <= 140) {
        this.completeExpedition();
      }
    }
  }

  triggerRandomEvent() {
    const roll = Phaser.Math.Between(1, 100);
    const type = roll <= 55 ? 'combat' : roll <= 90 ? 'supply' : 'gear';
    this.eventTimer = 4.0;
    if (type === 'gear' && Phaser.Math.Between(1, 100) > 55) {
      this.triggerSupplyEvent();
    } else if (type === 'combat') {
      this.triggerCombatEvent();
    } else if (type === 'supply') {
      this.triggerSupplyEvent();
    } else {
      this.triggerGearEvent();
    }
  }

  triggerCombatEvent() {
    const enemy = chooseRandom(enemyTypes);
    this.currentEvent = { type: 'combat', enemy };
    this.showEventHint(`戦闘発生：${enemy.name}！`);
    this.pauseTimer = 1.8;
    this.isPaused = true;
    this.resolveCombat(enemy);
  }

  resolveCombat(enemy) {
    const party = getSelectedChars().filter(char => char.hp > 0);
    if (party.length === 0) return;
    const totalAttack = party.reduce((sum, char) => sum + char.attack, 0) + Phaser.Math.Between(0, 6);
    const enemyDefense = enemy.strength + Phaser.Math.Between(0, 5);

    const advantage = party.some(char => char.personality === '無謀' || char.personality === '短気');
    const caution = party.some(char => char.personality === '慎重');
    const power = totalAttack + (advantage ? 2 : 0);

    if (power >= enemyDefense) {
      const gain = 4 + Math.floor(enemy.strength / 2);
      party.forEach(char => {
        char.exp += gain;
      });
      addLog(`敵${enemy.name}を打ち倒した。全員が経験を得て、戦いの臭いをまとっている。`);
      this.checkLevelUp();
      if (Phaser.Math.Between(1, 100) <= 25) {
        this.triggerGearDrop();
      }
    } else {
      const target = chooseRandom(party);
      let damage = Phaser.Math.Between(4, 7);
      if (target.personality === '無謀' || target.personality === '短気') damage += 2;
      if (target.personality === '慎重') damage = Math.max(1, damage - 2);
      target.hp -= damage;
      if (target.hp <= 0) {
        target.hp = 0;
        target.state = '重傷';
        addLog(`${target.name}はうめき声をあげ、戦闘で重傷を負った…。遠征から脱落した。`);
      } else {
        target.state = getStateLabel(target);
        addLog(`${target.name}が ${damage} ダメージを受けた。血の匂いが辺りに漂う。`);
      }
    }
    updateStates();
    updateUiState();
  }

  triggerSupplyEvent() {
    const party = getSelectedChars().filter(char => char.hp > 0);
    if (party.length === 0) return;
    const finder = chooseRandom(party);
    const totalSearch = party.reduce((sum, char) => sum + char.explore + char.luck, 0);
    const base = Phaser.Math.Between(1, 20) + Math.floor(totalSearch / 6);
    const itemIndex = Math.min(supplyItems.length - 1, Math.floor(base / 6));
    const name = supplyItems[itemIndex];
    const quantity = 1 + Math.floor((finder.explore + finder.luck) / 10) + Phaser.Math.Between(0, 1);

    supplies[name] += quantity;
    const text = `${finder.name}が瓦礫の山から${name}を${quantity}つ見つけた。拠点の乾いた棚が少し潤う。`;
    addLog(text);
    this.currentEvent = { type: 'supply' };
    this.showEventHint(`${name}を発見`);
    this.pauseTimer = 1.8;
    this.isPaused = true;
    updateUiState();
  }

  triggerGearEvent() {
    const party = getSelectedChars().filter(char => char.hp > 0);
    if (party.length === 0) return;
    const finder = chooseRandom(party);
    const found = chooseRandom(gearItems);
    gearInventory.push(found);
    addLog(`${finder.name}は瓦礫の奥から${found.name}を見つけた！`, found.rarity === 'rare');
    this.currentEvent = { type: 'gear' };
    this.showEventHint(`装備発見：${found.name}`);
    this.pauseTimer = 1.8;
    this.isPaused = true;
    updateUiState();
  }

  triggerGearDrop() {
    const drop = chooseRandom(gearItems);
    gearInventory.push(drop);
    addLog(`敵の持ち物から${drop.name}を回収した。`, drop.rarity === 'rare');
    updateUiState();
  }

  showEventHint(text) {
    this.eventHint.setText(text);
  }

  checkLevelUp() {
    const party = getSelectedChars();
    party.forEach(char => {
      while (char.exp >= 10) {
        char.exp -= 10;
        char.level += 1;
        char.maxHp += 2;
        char.attack += 1;
        char.hp += 2;
        if (char.hp > char.maxHp) char.hp = char.maxHp;
        addLog(`${char.name}はレベルアップ！力が増し、戦いの勘が研ぎ澄まされた。`);
      }
    });
    updateStates();
  }

  completeExpedition() {
    this.isActive = false;
    this.phase = 'complete';
    this.isPaused = false;
    this.eventHint.setText('');
    addLog('遠征隊は無事に拠点へ帰還した。戦利品と傷跡を抱えて戻る。');
    selectedIds.length = 0;
    updateStates();
    updateUiState();
    this.clearParty();
  }
}

ui.startButton.addEventListener('click', () => {
  if (gameScene) gameScene.startExpedition();
});

ui.nextButton.addEventListener('click', () => {
  if (gameScene && gameScene.isActive) return;
  selectedIds.length = 0;
  addLog('翌日。拠点は静まり返り、再び廃墟へ挑む準備が整った。');
  updateUiState();
});

updateStates();
createGame();
updateUiState();
