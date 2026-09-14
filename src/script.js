const board = document.querySelector('#gameBoard');
const statusMessage = document.querySelector('#statusMessage');
const statusBadge = document.querySelector('#statusBadge');
const levelValue = document.querySelector('#levelValue');
const livesValue = document.querySelector('#livesValue');
const keyValue = document.querySelector('#keyValue');
const movesValue = document.querySelector('#movesValue');
const difficultyText = document.querySelector('#difficultyText');
const helpDialog = document.querySelector('#helpDialog');
let level = 1;
let game = {};

function setupGame() {
	const size = Math.min(5 + (level - 1), 8);
	const trapCount = level + 1;
	const cells = Array.from({ length: size * size }, (_, index) => index);
	const start = size * (size - 1);
	const exit = size - 1;
	const blocked = new Set([start, exit]);
	const traps = new Set();
	while (traps.size < trapCount) {
		const index = cells[Math.floor(Math.random() * cells.length)];
		if (!blocked.has(index)) traps.add(index);
	}
	let key = cells[Math.floor(cells.length / 2)];
	while (blocked.has(key) || traps.has(key)) key = cells[Math.floor(Math.random() * cells.length)];
	game = { size, player: start, exit, key, traps, lives: 3, moves: 0, hasKey: false, active: true };
	render();
}

function render() {
	board.style.gridTemplateColumns = `repeat(${game.size}, minmax(0, 1fr))`;
	board.innerHTML = '';
	for (let index = 0; index < game.size * game.size; index += 1) {
		const tile = document.createElement('div');
		const isPlayer = index === game.player;
		const isExit = index === game.exit;
		tile.setAttribute('role', 'gridcell');
		tile.className = 'aspect-square rounded-md border border-emerald-800 bg-emerald-900/80 grid place-items-center text-lg transition-colors sm:text-2xl';
		if (isPlayer) { tile.textContent = '🧭'; tile.classList.add('bg-sky-500', 'border-sky-300'); }
		else if (isExit) { tile.textContent = game.hasKey ? '🚪' : '🔒'; tile.classList.add(game.hasKey ? 'bg-emerald-500' : 'bg-slate-600', 'border-slate-300'); }
		else if (game.hasKey && index === game.key) { tile.textContent = '🔑'; tile.classList.add('bg-amber-500', 'border-amber-300'); }
		else { tile.textContent = '·'; tile.classList.add('text-emerald-400'); }
		board.append(tile);
	}
	levelValue.textContent = level;
	livesValue.textContent = '❤'.repeat(game.lives) || 'หมดแล้ว';
	keyValue.textContent = game.hasKey ? 'พบแล้ว' : 'ยังไม่พบ';
	movesValue.textContent = game.moves;
	difficultyText.textContent = `แผนที่ ${game.size} × ${game.size} · กับดัก ${game.traps.size} จุด`;
}

function finish(message, won) {
	game.active = false;
	statusMessage.textContent = message;
	statusBadge.textContent = won ? 'ชนะแล้ว!' : 'แพ้แล้ว';
	statusBadge.className = `rounded-full px-3 py-1 text-xs font-bold ${won ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`;
}

function movePlayer(rowDelta, columnDelta) {
	if (!game.active) return;
	const row = Math.floor(game.player / game.size) + rowDelta;
	const column = (game.player % game.size) + columnDelta;
	if (row < 0 || row >= game.size || column < 0 || column >= game.size) return;
	game.player = row * game.size + column;
	game.moves += 1;
	if (game.player === game.key && !game.hasKey) { game.hasKey = true; statusMessage.textContent = 'ได้กุญแจแล้ว! มุ่งหน้าไปที่ประตูสีเขียว'; }
	if (game.traps.has(game.player)) { game.traps.delete(game.player); game.lives -= 1; statusMessage.textContent = `โดนหนาม! เหลือหัวใจ ${game.lives} ดวง`; if (game.lives === 0) finish('หัวใจหมดแล้ว ลองเริ่มใหม่อีกครั้ง', false); }
	if (game.player === game.exit && game.hasKey) finish(`ยอดเยี่ยม! คุณออกจากป่าได้ใน ${game.moves} ก้าว`, true);
	render();
}

document.addEventListener('keydown', (event) => { const keys = { ArrowUp: [-1, 0], w: [-1, 0], ArrowDown: [1, 0], s: [1, 0], ArrowLeft: [0, -1], a: [0, -1], ArrowRight: [0, 1], d: [0, 1] }; const move = keys[event.key]; if (move) { event.preventDefault(); movePlayer(...move); } });
document.querySelector('#restartButton').addEventListener('click', setupGame);
document.querySelector('#levelButton').addEventListener('click', () => { level = level >= 4 ? 1 : level + 1; setupGame(); statusMessage.textContent = `เริ่ม Level ${level} แล้ว ขอให้โชคดี!`; });
document.querySelector('#helpButton').addEventListener('click', () => helpDialog.showModal());
document.querySelector('#closeHelp').addEventListener('click', () => helpDialog.close());
document.querySelector('#closeHelpAction').addEventListener('click', () => helpDialog.close());
document.querySelector('#themeButton').addEventListener('click', () => document.documentElement.classList.toggle('dark'));
setupGame();
