iiRunner = {
    hasStarted: false,
    _rafId: null,
    _keys: new Set(),
    _onKeyDown: null,
    _onKeyUp: null,
    _onResize: null,

    start: function() {
        if (!iiRunner.hasStarted) {
            iiRunner.init();
            iiRunner.hasStarted = true;
        }
    },
    init: function() {
        iiRunner.createHtml();
        iiRunner.startGame();
    },
    createHtml: function() {
        var body = document.getElementsByTagName('body')[0];
        var div = document.createElement("div");
        div.id = "ii-container";
        div.style = "position:fixed; left:0; right:0; top:0; bottom:0; z-index:999; pointer-events:none";
        var canvas = document.createElement("canvas");
        div.appendChild(canvas);
        body.appendChild(div);
    },
    startGame: function() {
        window.scrollTo(0, 0);

        const canvas = document.querySelector("#ii-container canvas");
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        iiRunner._onResize = resizeCanvas;
        window.addEventListener('resize', resizeCanvas);

        // ---- Tron-style ship sprite ----
        function makeShipCanvas(dir) {
            const c = document.createElement('canvas');
            c.width = 128; c.height = 128;
            const cx = c.getContext('2d');
            cx.save();
            cx.translate(64, 64);
            const rot = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
            cx.rotate(rot[dir]);

            function hullPath() {
                cx.beginPath();
                cx.moveTo(55, 0);
                cx.lineTo(15, -20);
                cx.lineTo(-40, -16);
                cx.lineTo(-55, 0);
                cx.lineTo(-40, 16);
                cx.lineTo(15, 20);
                cx.closePath();
            }

            // Black hull fill
            cx.fillStyle = '#00060f';
            hullPath();
            cx.fill();

            // Cyan edge glow — two passes for intensity
            cx.shadowColor = '#00eeff';
            cx.shadowBlur = 40;
            cx.strokeStyle = '#00eeff';
            cx.lineWidth = 1.5;
            hullPath();
            cx.stroke();

            cx.shadowBlur = 18;
            cx.lineWidth = 2.5;
            hullPath();
            cx.stroke();

            // Wings — black fill, blue accent lines
            cx.fillStyle = '#000a18';
            cx.shadowColor = '#0066ff';
            cx.shadowBlur = 22;
            cx.strokeStyle = '#0066ff';
            cx.lineWidth = 2;

            cx.beginPath();
            cx.moveTo(5, -20); cx.lineTo(-25, -55); cx.lineTo(-40, -16);
            cx.closePath(); cx.fill(); cx.stroke();

            cx.beginPath();
            cx.moveTo(5, 20); cx.lineTo(-25, 55); cx.lineTo(-40, 16);
            cx.closePath(); cx.fill(); cx.stroke();

            // Engine — blue-white thruster glow
            cx.shadowColor = '#00ccff';
            cx.shadowBlur = 28;
            const grd = cx.createRadialGradient(-50, 0, 1, -50, 0, 18);
            grd.addColorStop(0, '#ffffff');
            grd.addColorStop(0.25, '#00eeff');
            grd.addColorStop(1, 'rgba(0,100,255,0)');
            cx.fillStyle = grd;
            cx.beginPath();
            cx.ellipse(-50, 0, 18, 10, 0, 0, Math.PI * 2);
            cx.fill();

            // Cockpit — bright cyan core
            cx.shadowColor = '#ffffff';
            cx.shadowBlur = 20;
            const cpGrd = cx.createRadialGradient(20, -3, 1, 20, 0, 11);
            cpGrd.addColorStop(0, '#ffffff');
            cpGrd.addColorStop(0.4, '#00eeff');
            cpGrd.addColorStop(1, '#003388');
            cx.fillStyle = cpGrd;
            cx.beginPath();
            cx.arc(20, 0, 11, 0, Math.PI * 2);
            cx.fill();

            // Cockpit rim glow
            cx.shadowColor = '#00eeff';
            cx.shadowBlur = 12;
            cx.strokeStyle = '#00eeff';
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.arc(20, 0, 11, 0, Math.PI * 2);
            cx.stroke();

            cx.restore();
            return c;
        }

        const ships = {
            right: makeShipCanvas('right'),
            left:  makeShipCanvas('left'),
            up:    makeShipCanvas('up'),
            down:  makeShipCanvas('down')
        };

        // Back portal
        const BACK_PORTAL = { x: 16, y: 16, size: 36 };

        function drawBackPortal() {
            const { x, y, size } = BACK_PORTAL;
            const cx = x + size / 2, cy = y + size / 2, r = size / 2;

            const grd = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
            grd.addColorStop(0, 'rgba(0,255,180,0.9)');
            grd.addColorStop(1, 'rgba(0,100,80,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00ffcc';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(size * 0.45)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('←', cx, cy);

            ctx.fillStyle = '#00ffcc';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('BACK', cx, cy + r + 10);
        }

        // Constants
        const SPEED = 480;
        const SCROLL_SPEED = 480;
        const EDGE_MARGIN = 160;
        const SPRITE_SIZE = 48;
        const BULLET_SPEED = 900;
        const ENEMY_BULLET_SPEED = 280;
        const DETECTION_RANGE = 420;
        const RESPAWN_DELAY = 1.5;

        // Player state
        let playerX = canvas.width / 2 - SPRITE_SIZE / 2;
        let playerY = 60;
        let playerDir = 'right';
        let controlsActive = true;
        let playerAlive = true;
        let playerRespawnTimer = 0;
        let bullets = [];
        let enemyBullets = [];
        let explosions = [];

        function isTypingInField() {
            const el = document.activeElement;
            return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
        }

        function getElViewportPos(el) {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
        }

        // ---- Explosions ----
        function spawnExplosion(x, y, colors, big) {
            const count = big ? 28 : 16;
            const particles = [];
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
                const speed = (big ? 90 : 45) + Math.random() * (big ? 140 : 70);
                const color = Array.isArray(colors) ? colors[i % colors.length] : colors;
                particles.push({ x, y, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, color });
            }
            explosions.push({ t: 0, duration: big ? 1.0 : 0.6, particles });
        }

        function killPlayer() {
            if (!playerAlive) return;
            playerAlive = false;
            playerRespawnTimer = RESPAWN_DELAY;
            spawnExplosion(
                playerX + SPRITE_SIZE / 2,
                playerY + SPRITE_SIZE / 2,
                ['#00eeff', '#ffffff', '#0066ff', '#00ccff'],
                true
            );
            bullets = [];
        }

        function respawnPlayer() {
            playerX = canvas.width / 2 - SPRITE_SIZE / 2;
            playerY = 60;
            playerDir = 'right';
            playerAlive = true;
        }

        // ---- Enemy generation ----
        function sampleArray(arr, max) {
            const copy = arr.slice();
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy.slice(0, max);
        }

        function generateEnemies() {
            const enemies = [];

            // Pop-up Turrets: buttons, inputs, links, labels, selects — LOS-based
            const popupEls = Array.from(document.querySelectorAll(
                'button, input, select, textarea, label, a[href], [role="button"]'
            )).filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 4 && r.height > 4; // skip invisible elements
            });
            sampleArray(popupEls, 3).forEach(el => {
                enemies.push({
                    type: 'popup_turret', el, dead: false,
                    fireTimer: Math.random() * 2 + 0.5,
                    fireCooldown: 1.1 + Math.random() * 0.8,
                    losTimer: 0, losThreshold: 0.7,
                    color: '#ff4400'
                });
            });

            // List-Item Snakes: ul/ol — kill head to destroy whole snake
            const listEls = Array.from(document.querySelectorAll('ul, ol'));
            sampleArray(listEls, 2).forEach(el => {
                const items = Array.from(el.querySelectorAll(':scope > li')).slice(0, 8);
                if (items.length === 0) return;
                enemies.push({
                    type: 'snake', el, items, dead: false,
                    fireTimer: Math.random() * 3 + 1.5,
                    fireCooldown: 1.8 + Math.random() * 1.2,
                    color: '#00ff44'
                });
            });

            // Table Turrets: td/th cells
            const tdEls = Array.from(document.querySelectorAll('td, th'));
            sampleArray(tdEls, 3).forEach(el => {
                enemies.push({
                    type: 'table_turret', el, dead: false,
                    fireTimer: Math.random() * 1.5 + 0.3,
                    fireCooldown: 1.0 + Math.random() * 0.7,
                    color: '#ffaa00'
                });
            });

            // Paragraph turrets: p, blockquote, pre, code — 1 shot only
            const paraEls = Array.from(document.querySelectorAll('p, blockquote, pre, code'));
            sampleArray(paraEls, 3).forEach(el => {
                enemies.push({
                    type: 'para_turret', el, dead: false,
                    fireTimer: Math.random() * 3 + 1,
                    fireCooldown: 9999,
                    shotsLeft: 1,
                    color: '#cc00ff'
                });
            });

            // Heading turrets: h1-h6, nav, header, footer — wider spread shot
            const headingEls = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, nav, header, footer'));
            sampleArray(headingEls, 2).forEach(el => {
                enemies.push({
                    type: 'heading_turret', el, dead: false,
                    fireTimer: Math.random() * 2 + 1,
                    fireCooldown: 2.2 + Math.random() * 1.5,
                    color: '#ff0088'
                });
            });

            return enemies;
        }

        let enemies = generateEnemies();

        // ---- Enemy AI ----
        function enemyFire(enemy, ex, ey, spread) {
            const px = playerX + SPRITE_SIZE / 2;
            const py = playerY + SPRITE_SIZE / 2;
            const dx = px - ex, dy = py - ey;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) return;
            const ndx = dx / dist, ndy = dy / dist;
            if (spread) {
                for (let a = -0.22; a <= 0.22; a += 0.22) {
                    const ca = Math.cos(a), sa = Math.sin(a);
                    enemyBullets.push({ x: ex, y: ey, dx: ndx * ca - ndy * sa, dy: ndx * sa + ndy * ca, color: enemy.color });
                }
            } else {
                enemyBullets.push({ x: ex, y: ey, dx: ndx, dy: ndy, color: enemy.color });
            }
        }

        function killEnemy(enemy) {
            if (enemy.dead) return;
            enemy.dead = true;
            let pos;
            if (enemy.type === 'snake') {
                pos = enemy.items && enemy.items.length > 0 ? getElViewportPos(enemy.items[0]) : null;
            } else {
                pos = getElViewportPos(enemy.el);
            }
            if (pos) spawnExplosion(pos.x, pos.y, [enemy.color, '#ffffff', '#ffdd00'], false);
        }

        function updateEnemies(dt) {
            const w = canvas.width, h = canvas.height;
            const px = playerX + SPRITE_SIZE / 2;
            const py = playerY + SPRITE_SIZE / 2;

            enemies.forEach(enemy => {
                if (enemy.dead) return;

                let pos;
                if (enemy.type === 'snake') {
                    if (!enemy.items || enemy.items.length === 0) { enemy.dead = true; return; }
                    pos = getElViewportPos(enemy.items[0]);
                } else {
                    pos = getElViewportPos(enemy.el);
                }

                if (pos.x < -200 || pos.x > w + 200 || pos.y < -200 || pos.y > h + 200) return;

                const distToPlayer = Math.sqrt((px - pos.x) ** 2 + (py - pos.y) ** 2);
                const inRange = distToPlayer < DETECTION_RANGE;

                if (enemy.type === 'popup_turret') {
                    const aligned = Math.abs(px - pos.x) < 90 || Math.abs(py - pos.y) < 90;
                    if (inRange && aligned) {
                        enemy.losTimer = Math.min(enemy.losTimer + dt, enemy.losThreshold + 0.5);
                        if (enemy.losTimer >= enemy.losThreshold) {
                            enemy.fireTimer -= dt;
                            if (enemy.fireTimer <= 0) {
                                enemyFire(enemy, pos.x, pos.y, false);
                                enemy.fireTimer = enemy.fireCooldown;
                            }
                        }
                    } else {
                        enemy.losTimer = Math.max(0, enemy.losTimer - dt * 2);
                    }
                } else if (enemy.type === 'para_turret') {
                    if (inRange && enemy.shotsLeft > 0) {
                        enemy.fireTimer -= dt;
                        if (enemy.fireTimer <= 0) {
                            enemyFire(enemy, pos.x, pos.y, false);
                            enemy.shotsLeft--;
                            enemy.fireTimer = 9999;
                        }
                    }
                } else {
                    if (inRange) {
                        enemy.fireTimer -= dt;
                        if (enemy.fireTimer <= 0) {
                            enemyFire(enemy, pos.x, pos.y, enemy.type === 'heading_turret');
                            enemy.fireTimer = enemy.fireCooldown;
                        }
                    }
                }
            });

            enemyBullets = enemyBullets.filter(b => {
                b.x += b.dx * ENEMY_BULLET_SPEED * dt;
                b.y += b.dy * ENEMY_BULLET_SPEED * dt;
                return b.x > -50 && b.x < w + 50 && b.y > -50 && b.y < h + 50;
            });
        }

        // ---- Collision detection ----
        function checkCollisions() {
            const px = playerX + SPRITE_SIZE / 2;
            const py = playerY + SPRITE_SIZE / 2;
            const playerRadius = 12;

            bullets = bullets.filter(b => {
                for (let i = 0; i < enemies.length; i++) {
                    const enemy = enemies[i];
                    if (enemy.dead) continue;
                    let pos, hitRadius;
                    if (enemy.type === 'snake') {
                        if (!enemy.items || enemy.items.length === 0) continue;
                        pos = getElViewportPos(enemy.items[0]);
                        hitRadius = 20;
                    } else {
                        pos = getElViewportPos(enemy.el);
                        hitRadius = Math.min(Math.max(pos.w, pos.h) / 2 + 8, 40);
                    }
                    const dist = Math.sqrt((b.x - pos.x) ** 2 + (b.y - pos.y) ** 2);
                    if (dist < hitRadius) {
                        killEnemy(enemy);
                        return false;
                    }
                }
                return true;
            });

            if (playerAlive) {
                for (let i = enemyBullets.length - 1; i >= 0; i--) {
                    const b = enemyBullets[i];
                    const dist = Math.sqrt((b.x - px) ** 2 + (b.y - py) ** 2);
                    if (dist < playerRadius) {
                        enemyBullets.splice(i, 1);
                        killPlayer();
                        break;
                    }
                }
            }
        }

        // ---- Draw helpers ----
        // Draw a glowing line with double-pass for Tron intensity
        function glowLine(x1, y1, x2, y2, color, width, blur) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = blur * 2;
            ctx.lineWidth = width * 0.5;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.shadowBlur = blur;
            ctx.lineWidth = width;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.restore();
        }

        function glowCircle(x, y, r, color, fillColor, lineWidth, blur) {
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = blur * 2;
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth * 0.5;
            ctx.fillStyle = fillColor || 'transparent';
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
            if (fillColor) ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = blur;
            ctx.lineWidth = lineWidth;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        // ---- Draw enemies ----
        function drawEnemies() {
            const w = canvas.width, h = canvas.height;
            const px = playerX + SPRITE_SIZE / 2;
            const py = playerY + SPRITE_SIZE / 2;

            enemies.forEach(enemy => {
                if (enemy.dead) return;

                if (enemy.type === 'snake') {
                    if (!enemy.items) return;
                    const positions = enemy.items.map(item => getElViewportPos(item));
                    const anyVisible = positions.some(p => p.x > -50 && p.x < w + 50 && p.y > -50 && p.y < h + 50);
                    if (!anyVisible) return;

                    // Glowing spine — double pass
                    if (positions.length > 1) {
                        ctx.save();
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.shadowColor = enemy.color;
                        ctx.shadowBlur = 20;
                        ctx.strokeStyle = enemy.color;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(positions[0].x, positions[0].y);
                        for (let i = 1; i < positions.length; i++) ctx.lineTo(positions[i].x, positions[i].y);
                        ctx.stroke();
                        ctx.shadowBlur = 8;
                        ctx.strokeStyle = '#002211';
                        ctx.lineWidth = 7;
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.beginPath();
                        ctx.moveTo(positions[0].x, positions[0].y);
                        for (let i = 1; i < positions.length; i++) ctx.lineTo(positions[i].x, positions[i].y);
                        ctx.stroke();
                        ctx.restore();
                    }

                    positions.forEach((pos, i) => {
                        if (pos.x < -50 || pos.x > w + 50 || pos.y < -50 || pos.y > h + 50) return;
                        const isHead = i === 0;
                        const size = isHead ? 16 : 10;
                        // Dark fill
                        ctx.save();
                        ctx.fillStyle = isHead ? '#001a08' : '#000d04';
                        ctx.beginPath(); ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2); ctx.fill();
                        ctx.restore();
                        // Glow ring
                        glowCircle(pos.x, pos.y, size, enemy.color, null, isHead ? 2.5 : 1.5, isHead ? 22 : 10);
                        if (isHead) {
                            // Eyes
                            ctx.save();
                            ctx.fillStyle = '#00ff88';
                            ctx.shadowColor = '#00ff88';
                            ctx.shadowBlur = 10;
                            ctx.beginPath(); ctx.arc(pos.x - 5, pos.y - 4, 3, 0, Math.PI * 2); ctx.fill();
                            ctx.beginPath(); ctx.arc(pos.x + 5, pos.y - 4, 3, 0, Math.PI * 2); ctx.fill();
                            ctx.fillStyle = '#000000';
                            ctx.shadowBlur = 0;
                            ctx.beginPath(); ctx.arc(pos.x - 5, pos.y - 4, 1.5, 0, Math.PI * 2); ctx.fill();
                            ctx.beginPath(); ctx.arc(pos.x + 5, pos.y - 4, 1.5, 0, Math.PI * 2); ctx.fill();
                            ctx.restore();
                        }
                    });

                } else {
                    const pos = getElViewportPos(enemy.el);
                    if (pos.x < -50 || pos.x > w + 50 || pos.y < -50 || pos.y > h + 50) return;

                    const ang = Math.atan2(py - pos.y, px - pos.x);

                    if (enemy.type === 'popup_turret') {
                        // Dark base platform
                        ctx.save();
                        ctx.fillStyle = '#1a0600';
                        ctx.shadowColor = enemy.color;
                        ctx.shadowBlur = 18;
                        ctx.strokeStyle = enemy.color;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.rect(pos.x - 11, pos.y - 8, 22, 16);
                        ctx.fill(); ctx.stroke();
                        ctx.restore();
                        // Rotating barrel with double-glow
                        glowLine(pos.x, pos.y,
                            pos.x + Math.cos(ang) * 19, pos.y + Math.sin(ang) * 19,
                            enemy.color, 4, 16);
                        // LOS charge aura
                        if (enemy.losTimer > 0) {
                            ctx.save();
                            ctx.globalAlpha = (enemy.losTimer / enemy.losThreshold) * 0.4;
                            ctx.shadowColor = enemy.color;
                            ctx.shadowBlur = 30;
                            ctx.fillStyle = enemy.color;
                            ctx.beginPath();
                            ctx.arc(pos.x, pos.y, 24 + enemy.losTimer * 12, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1;
                            ctx.restore();
                        }

                    } else if (enemy.type === 'table_turret') {
                        ctx.save();
                        ctx.fillStyle = '#100a00';
                        ctx.shadowColor = enemy.color;
                        ctx.shadowBlur = 20;
                        ctx.strokeStyle = enemy.color;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.rect(pos.x - 7, pos.y - 7, 14, 14);
                        ctx.fill(); ctx.stroke();
                        ctx.restore();
                        glowLine(pos.x, pos.y,
                            pos.x + Math.cos(ang) * 14, pos.y + Math.sin(ang) * 14,
                            enemy.color, 3, 14);
                        // Core dot
                        ctx.save();
                        ctx.fillStyle = enemy.color;
                        ctx.shadowColor = enemy.color;
                        ctx.shadowBlur = 14;
                        ctx.beginPath(); ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2); ctx.fill();
                        ctx.restore();

                    } else if (enemy.type === 'para_turret') {
                        ctx.save();
                        ctx.fillStyle = '#0d0012';
                        ctx.shadowColor = enemy.color;
                        ctx.shadowBlur = 22;
                        ctx.strokeStyle = enemy.color;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 11, 0, Math.PI * 2);
                        ctx.fill(); ctx.stroke();
                        ctx.restore();
                        if (enemy.shotsLeft > 0) {
                            glowLine(pos.x, pos.y,
                                pos.x + Math.cos(ang) * 18, pos.y + Math.sin(ang) * 18,
                                enemy.color, 3, 14);
                        } else {
                            // Spent — dim cross
                            ctx.save();
                            ctx.strokeStyle = '#333333';
                            ctx.lineWidth = 2;
                            ctx.shadowBlur = 0;
                            ctx.beginPath();
                            ctx.moveTo(pos.x - 6, pos.y - 6); ctx.lineTo(pos.x + 6, pos.y + 6);
                            ctx.moveTo(pos.x + 6, pos.y - 6); ctx.lineTo(pos.x - 6, pos.y + 6);
                            ctx.stroke();
                            ctx.restore();
                        }

                    } else if (enemy.type === 'heading_turret') {
                        // Large glowing ring body
                        ctx.save();
                        ctx.fillStyle = '#160008';
                        ctx.shadowColor = enemy.color;
                        ctx.shadowBlur = 30;
                        ctx.strokeStyle = enemy.color;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
                        ctx.fill(); ctx.stroke();
                        // Double glow ring
                        ctx.shadowBlur = 12;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                        // Three barrels
                        for (let a = -0.24; a <= 0.24; a += 0.24) {
                            glowLine(pos.x, pos.y,
                                pos.x + Math.cos(ang + a) * 26, pos.y + Math.sin(ang + a) * 26,
                                enemy.color, 3.5, 18);
                        }
                        // Hot core
                        ctx.save();
                        ctx.fillStyle = enemy.color;
                        ctx.shadowColor = '#ffffff';
                        ctx.shadowBlur = 16;
                        ctx.beginPath(); ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2); ctx.fill();
                        ctx.restore();
                    }
                }
            });

            // Enemy bullets — glowing square data packets
            enemyBullets.forEach(b => {
                ctx.save();
                ctx.shadowColor = b.color;
                ctx.shadowBlur = 22;
                ctx.fillStyle = b.color;
                ctx.fillRect(b.x - 4, b.y - 4, 8, 8);
                // bright core
                ctx.shadowBlur = 6;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
                ctx.restore();
            });
        }

        // ---- Explosions draw ----
        function drawExplosions(dt) {
            explosions = explosions.filter(exp => {
                exp.t += dt;
                const progress = exp.t / exp.duration;
                if (progress >= 1) return false;
                exp.particles.forEach(p => {
                    p.x += p.dx * dt;
                    p.y += p.dy * dt;
                    p.dx *= (1 - dt * 3.5);
                    p.dy *= (1 - dt * 3.5);
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, 1 - progress);
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 12;
                    ctx.fillStyle = p.color;
                    const size = Math.max(1, (1 - progress) * 6);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    ctx.fill();
                    // White hot core
                    ctx.shadowBlur = 4;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });
                return true;
            });
        }

        // ---- Shoot / click ----
        function shootBullet() {
            if (!playerAlive) return;
            const cx = playerX + SPRITE_SIZE / 2;
            const cy = playerY + SPRITE_SIZE / 2;
            const dirs = { right: [1,0], left: [-1,0], up: [0,-1], down: [0,1] };
            const [dx, dy] = dirs[playerDir];
            bullets.push({ x: cx, y: cy, dx, dy });
        }

        function doClick() {
            const cx = playerX + SPRITE_SIZE / 2;
            const cy = playerY + SPRITE_SIZE / 2;
            const bp = BACK_PORTAL;
            if (cx >= bp.x && cx <= bp.x + bp.size && cy >= bp.y && cy <= bp.y + bp.size) {
                history.back();
            } else {
                const el = document.elementFromPoint(cx, cy);
                if (el) el.click();
            }
        }

        // ---- Input ----
        const keys = iiRunner._keys;
        keys.clear();

        const GAME_KEYS = new Set(['w','a','s','d','[',']','Escape']);

        iiRunner._onKeyDown = function(e) {
            if (e.key === 'Escape') {
                controlsActive = !controlsActive;
                keys.clear();
                e.preventDefault();
                return;
            }
            if (!controlsActive || isTypingInField()) return;

            if (GAME_KEYS.has(e.key)) e.preventDefault();
            keys.add(e.key);

            if (e.key === '[') shootBullet();
            if (e.key === ']') doClick();
        };
        iiRunner._onKeyUp = function(e) {
            keys.delete(e.key);
        };
        window.addEventListener('keydown', iiRunner._onKeyDown, { capture: true });
        window.addEventListener('keyup', iiRunner._onKeyUp);

        // ---- Game loop ----
        let lastTime = null;
        function loop(ts) {
            if (!lastTime) lastTime = ts;
            const dt = Math.min((ts - lastTime) / 1000, 0.05);
            lastTime = ts;

            const w = canvas.width;
            const h = canvas.height;

            if (!playerAlive) {
                playerRespawnTimer -= dt;
                if (playerRespawnTimer <= 0) respawnPlayer();
            }

            if (controlsActive && playerAlive) {
                const spd = SPEED * dt;
                if (keys.has('d')) { playerDir = 'right'; playerX += spd; }
                if (keys.has('a')) { playerDir = 'left';  playerX -= spd; }
                if (keys.has('w')) { playerDir = 'up';    playerY -= spd; }
                if (keys.has('s')) { playerDir = 'down';  playerY += spd; }

                const canScrollRight = window.scrollX + window.innerWidth < document.documentElement.scrollWidth;
                const canScrollLeft  = window.scrollX > 0;
                const canScrollDown  = window.scrollY + window.innerHeight < document.documentElement.scrollHeight;
                const canScrollUp    = window.scrollY > 0;

                if (canScrollRight && playerX > w - EDGE_MARGIN) {
                    window.scrollBy(SCROLL_SPEED * dt, 0); playerX = w - EDGE_MARGIN;
                } else if (canScrollLeft && playerX < EDGE_MARGIN) {
                    window.scrollBy(-SCROLL_SPEED * dt, 0); playerX = EDGE_MARGIN;
                }
                if (canScrollDown && playerY > h - EDGE_MARGIN) {
                    window.scrollBy(0, SCROLL_SPEED * dt); playerY = h - EDGE_MARGIN;
                } else if (canScrollUp && playerY < EDGE_MARGIN) {
                    window.scrollBy(0, -SCROLL_SPEED * dt); playerY = EDGE_MARGIN;
                }

                const spriteSize = 128 * 0.3;
                playerX = Math.max(0, Math.min(w - spriteSize, playerX));
                playerY = Math.max(0, Math.min(h - spriteSize, playerY));
            }

            bullets = bullets.filter(b => {
                b.x += b.dx * BULLET_SPEED * dt;
                b.y += b.dy * BULLET_SPEED * dt;
                return b.x >= 0 && b.x <= w && b.y >= 0 && b.y <= h;
            });

            updateEnemies(dt);
            checkCollisions();

            // Draw
            ctx.clearRect(0, 0, w, h);
            drawBackPortal();
            drawEnemies();

            // Player bullets — bright cyan with glow
            bullets.forEach(b => {
                ctx.save();
                ctx.shadowColor = '#00eeff';
                ctx.shadowBlur = 24;
                ctx.fillStyle = '#0055cc';
                ctx.beginPath();
                ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#00eeff';
                ctx.beginPath();
                ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Player ship
            if (playerAlive) {
                ctx.drawImage(ships[playerDir], playerX, playerY, SPRITE_SIZE, SPRITE_SIZE);
            } else {
                // Flashing respawn ring
                if (Math.floor(playerRespawnTimer * 4) % 2 === 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    ctx.shadowColor = '#00eeff';
                    ctx.shadowBlur = 28;
                    ctx.strokeStyle = '#00eeff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, 60 + SPRITE_SIZE / 2, SPRITE_SIZE / 2 + 5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            }

            drawExplosions(dt);

            if (!controlsActive) {
                ctx.save();
                ctx.fillStyle = 'rgba(255,200,0,0.85)';
                ctx.font = 'bold 13px monospace';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillText('[ CONTROLS OFF — Esc to resume ]', w - 12, 12);
                ctx.restore();
            }

            iiRunner._rafId = requestAnimationFrame(loop);
        }
        iiRunner._rafId = requestAnimationFrame(loop);
    },
    stop: function() {
        if (iiRunner._rafId) cancelAnimationFrame(iiRunner._rafId);
        if (iiRunner._onKeyDown) window.removeEventListener('keydown', iiRunner._onKeyDown, { capture: true });
        if (iiRunner._onKeyUp)   window.removeEventListener('keyup', iiRunner._onKeyUp);
        if (iiRunner._onResize)  window.removeEventListener('resize', iiRunner._onResize);
        iiRunner._keys.clear();
        var body = document.getElementsByTagName('body')[0];
        var div = document.getElementById("ii-container");
        if (div) body.removeChild(div);
        iiRunner.hasStarted = false;
    },
    afterDOMLoaded: function() {
        chrome.storage.local.get("iiRunning", function(data) {
            if (typeof data.iiRunning != "undefined" && data.iiRunning === true) {
                iiRunner.start();
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iiRunner.afterDOMLoaded);
} else {
    iiRunner.afterDOMLoaded();
}
