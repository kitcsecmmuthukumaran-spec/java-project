const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const healthText = document.getElementById("health");
const scoreText = document.getElementById("score");
const waveText = document.getElementById("wave");

const overlay = document.getElementById("gameOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const startButton = document.getElementById("startButton");

const W = canvas.width;
const H = canvas.height;

let player;
let zombies = [];
let bullets = [];

let score = 0;
let wave = 1;
let running = false;

let keys = {};
let mouse = { x: W / 2, y: H / 2 };
let mouseDown = false;

let lastTime = 0;
let spawnTimer = 0;
let shootTimer = 0;

function resetGame() {
    player = {
        x: W / 2,
        y: H / 2,
        radius: 15,
        speed: 220,
        health: 100,
        invulnerable: 0
    };

    zombies = [];
    bullets = [];

    score = 0;
    wave = 1;
    spawnTimer = 0;
    shootTimer = 0;

    for (let i = 0; i < 4; i++) {
        spawnZombie();
    }

    updateStats();
}

function startGame() {
    resetGame();

    running = true;
    overlay.classList.add("hidden");

    lastTime = performance.now();

    requestAnimationFrame(gameLoop);
}

function endGame() {
    running = false;

    overlayTitle.textContent = "GAME OVER!";
    overlayMessage.textContent =
        "Your score: " + score + ". Try again!";

    startButton.textContent = "PLAY AGAIN";

    overlay.classList.remove("hidden");
}

function updateStats() {
    healthText.textContent = Math.max(
        0,
        Math.ceil(player.health)
    );

    scoreText.textContent = score;
    waveText.textContent = wave;

    healthText.style.color =
        player.health < 30 ? "#ff5555" : "#a3ff68";
}

// AI Zombie Creation
function spawnZombie() {
    const side = Math.floor(Math.random() * 4);

    let x;
    let y;

    if (side === 0) {
        x = -20;
        y = Math.random() * H;
    } else if (side === 1) {
        x = W + 20;
        y = Math.random() * H;
    } else if (side === 2) {
        x = Math.random() * W;
        y = -20;
    } else {
        x = Math.random() * W;
        y = H + 20;
    }

    const strong = Math.random() < 0.2;

    zombies.push({
        x: x,
        y: y,
        radius: strong ? 18 : 14,
        speed: (strong ? 48 : 65) + wave * 3,
        health: strong ? 3 : 1,
        strong: strong,
        attackCooldown: 0
    });
}

// Shooting System
function shoot() {
    if (shootTimer > 0 || !running) {
        return;
    }

    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;

    const distance = Math.hypot(dx, dy) || 1;

    bullets.push({
        x: player.x + (dx / distance) * 20,
        y: player.y + (dy / distance) * 20,
        vx: (dx / distance) * 500,
        vy: (dy / distance) * 500,
        radius: 4,
        life: 1.2
    });

    shootTimer = 0.2;
}

// Main Game Loop
function gameLoop(time) {
    if (!running) {
        return;
    }

    const dt = Math.min(
        (time - lastTime) / 1000,
        0.033
    );

    lastTime = time;

    update(dt);
    draw();

    if (running) {
        requestAnimationFrame(gameLoop);
    }
}

// Update Game
function update(dt) {
    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["arrowup"]) dy--;
    if (keys["s"] || keys["arrowdown"]) dy++;
    if (keys["a"] || keys["arrowleft"]) dx--;
    if (keys["d"] || keys["arrowright"]) dx++;

    const distance = Math.hypot(dx, dy) || 1;

    player.x += dx / distance * player.speed * dt;
    player.y += dy / distance * player.speed * dt;

    player.x = Math.max(
        player.radius,
        Math.min(W - player.radius, player.x)
    );

    player.y = Math.max(
        player.radius,
        Math.min(H - player.radius, player.y)
    );

    player.invulnerable = Math.max(
        0,
        player.invulnerable - dt
    );

    shootTimer = Math.max(0, shootTimer - dt);

    if (mouseDown || keys[" "]) {
        shoot();
    }

    // Spawn more zombies over time
    spawnTimer -= dt;

    if (spawnTimer <= 0) {
        spawnZombie();

        spawnTimer = Math.max(
            0.45,
            1.5 - wave * 0.06
        );
    }

    // AI: Zombies follow the player
    for (const zombie of zombies) {
        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;

        const distance = Math.hypot(dx, dy) || 1;

        zombie.x +=
            (dx / distance) * zombie.speed * dt;

        zombie.y +=
            (dy / distance) * zombie.speed * dt;

        zombie.attackCooldown = Math.max(
            0,
            zombie.attackCooldown - dt
        );

        // Zombie touches player
        if (
            distance < zombie.radius + player.radius &&
            zombie.attackCooldown <= 0 &&
            player.invulnerable <= 0
        ) {
            player.health -= zombie.strong ? 15 : 8;

            player.invulnerable = 0.55;
            zombie.attackCooldown = 0.8;

            if (player.health <= 0) {
                player.health = 0;
                updateStats();
                endGame();
                return;
            }
        }
    }

    // Move bullets and check collisions
    for (const bullet of bullets) {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        bullet.life -= dt;

        for (const zombie of zombies) {
            if (zombie.health <= 0 || bullet.life <= 0) {
                continue;
            }

            const distance = Math.hypot(
                bullet.x - zombie.x,
                bullet.y - zombie.y
            );

            if (distance < bullet.radius + zombie.radius) {
                zombie.health -= 1;
                bullet.life = 0;

                if (zombie.health <= 0) {
                    score += zombie.strong ? 25 : 10;
                }
            }
        }
    }

    bullets = bullets.filter(
        b => b.life > 0 &&
        b.x > -10 && b.x < W + 10 &&
        b.y > -10 && b.y < H + 10
    );

    zombies = zombies.filter(z => z.health > 0);

    wave = 1 + Math.floor(score / 100);

    updateStats();
}

// Draw Game Background and Characters
function draw() {
    ctx.fillStyle = "#101b1b";
    ctx.fillRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = "#1b302b";
    ctx.lineWidth = 1;

    for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }

    for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    // Draw bullets
    ctx.fillStyle = "#c7ff8b";

    for (const bullet of bullets) {
        ctx.beginPath();

        ctx.arc(
            bullet.x,
            bullet.y,
            bullet.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    // Draw zombies
    for (const zombie of zombies) {
        ctx.fillStyle = zombie.strong
            ? "#bb6a3e"
            : "#4c9d55";

        ctx.beginPath();

        ctx.arc(
            zombie.x,
            zombie.y,
            zombie.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.strokeStyle = "#c8f7b8";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Zombie eyes
        ctx.fillStyle = "#152019";

        ctx.beginPath();
        ctx.arc(
            zombie.x - 4,
            zombie.y - 3,
            2,
            0,
            Math.PI * 2
        );
        ctx.arc(
            zombie.x + 4,
            zombie.y - 3,
            2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    // Draw player
    ctx.fillStyle = player.invulnerable > 0
        ? "#a9f1ff"
        : "#4b91ff";

    ctx.beginPath();

    ctx.arc(
        player.x,
        player.y,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Player weapon points towards mouse
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    const distance = Math.hypot(dx, dy) || 1;

    ctx.strokeStyle = "#e9f7df";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    ctx.beginPath();

    ctx.moveTo(
        player.x + dx / distance * 7,
        player.y + dy / distance * 7
    );

    ctx.lineTo(
        player.x + dx / distance * 28,
        player.y + dy / distance * 28
    );

    ctx.stroke();

    // Aim cursor
    ctx.strokeStyle = "#a3ff68";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
    ctx.stroke();
}

// Mouse controls
canvas.addEventListener("mousemove", function(event) {
    const rect = canvas.getBoundingClientRect();

    mouse.x =
        (event.clientX - rect.left) * W / rect.width;

    mouse.y =
        (event.clientY - rect.top) * H / rect.height;
});

canvas.addEventListener("mousedown", function() {
    mouseDown = true;
});

window.addEventListener("mouseup", function() {
    mouseDown = false;
});

// Keyboard controls
window.addEventListener("keydown", function(event) {
    const key = event.key.toLowerCase();

    if (
        ["arrowup", "arrowdown", "arrowleft",
         "arrowright", " "].includes(key)
    ) {
        event.preventDefault();
    }

    keys[key] = true;

    if (key === "enter" && !running) {
        startGame();
    }
});

window.addEventListener("keyup", function(event) {
    keys[event.key.toLowerCase()] = false;
});

// Start or restart
startButton.addEventListener("click", startGame);

// Initial screen
resetGame();
draw();
