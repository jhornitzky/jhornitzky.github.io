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

        // Build ship sprite canvases for each direction
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

            cx.shadowColor = '#000000';
            cx.shadowBlur = 12;
            cx.strokeStyle = '#003366';
            cx.lineWidth = 5;
            hullPath();
            cx.stroke();

            cx.shadowColor = '#00ffff';
            cx.shadowBlur = 18;
            cx.fillStyle = '#00ccff';
            hullPath();
            cx.fill();

            cx.fillStyle = '#0055aa';
            cx.strokeStyle = '#003366';
            cx.lineWidth = 3;
            cx.beginPath();
            cx.moveTo(5, -20); cx.lineTo(-25, -55); cx.lineTo(-40, -16);
            cx.closePath(); cx.fill(); cx.stroke();

            cx.beginPath();
            cx.moveTo(5, 20); cx.lineTo(-25, 55); cx.lineTo(-40, 16);
            cx.closePath(); cx.fill(); cx.stroke();

            cx.shadowBlur = 0;
            const grd = cx.createRadialGradient(-50, 0, 1, -50, 0, 16);
            grd.addColorStop(0, '#ffffff');
            grd.addColorStop(0.3, '#ff8800');
            grd.addColorStop(1, 'rgba(255,60,0,0)');
            cx.fillStyle = grd;
            cx.beginPath();
            cx.ellipse(-50, 0, 16, 9, 0, 0, Math.PI * 2);
            cx.fill();

            cx.shadowColor = '#ffffff';
            cx.shadowBlur = 10;
            const cpGrd = cx.createRadialGradient(20, -4, 1, 20, 0, 12);
            cpGrd.addColorStop(0, '#ffffff');
            cpGrd.addColorStop(1, '#00aaff');
            cx.fillStyle = cpGrd;
            cx.beginPath();
            cx.arc(20, 0, 12, 0, Math.PI * 2);
            cx.fill();

            cx.restore();
            return c;
        }

        const ships = {
            right: makeShipCanvas('right'),
            left:  makeShipCanvas('left'),
            up:    makeShipCanvas('up'),
            down:  makeShipCanvas('down')
        };

        // Back portal (fixed top-left, always in viewport)
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
            ctx.shadowBlur = 10;
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

        // Player state
        const SPEED = 480;
        const SCROLL_SPEED = 480;
        const EDGE_MARGIN = 160;
        const SPRITE_SIZE = 48;
        const BULLET_SPEED = 900;
        let playerX = 0, playerY = 0, playerDir = 'right';
        let controlsActive = true;
        let bullets = [];

        function isTypingInField() {
            const el = document.activeElement;
            return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
        }

        function shootBullet() {
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

        // Input
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

        // Game loop
        let lastTime = null;
        function loop(ts) {
            if (!lastTime) lastTime = ts;
            const dt = Math.min((ts - lastTime) / 1000, 0.05);
            lastTime = ts;

            const w = canvas.width;
            const h = canvas.height;

            if (controlsActive) {
                const spd = SPEED * dt;

                // Movement (WASD)
                if (keys.has('d')) { playerDir = 'right'; playerX += spd; }
                if (keys.has('a')) { playerDir = 'left';  playerX -= spd; }
                if (keys.has('w')) { playerDir = 'up';    playerY -= spd; }
                if (keys.has('s')) { playerDir = 'down';  playerY += spd; }

                // Edge scrolling (only on scrollable edges)
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

                // Clamp to viewport
                const spriteSize = 128 * 0.3;
                playerX = Math.max(0, Math.min(w - spriteSize, playerX));
                playerY = Math.max(0, Math.min(h - spriteSize, playerY));
            }

            // Update bullets
            bullets = bullets.filter(b => {
                b.x += b.dx * BULLET_SPEED * dt;
                b.y += b.dy * BULLET_SPEED * dt;
                return b.x >= 0 && b.x <= w && b.y >= 0 && b.y <= h;
            });

            // Draw
            ctx.clearRect(0, 0, w, h);

            drawBackPortal();

            // Bullets
            bullets.forEach(b => {
                ctx.save();
                ctx.shadowColor = '#ffff00';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#ffee44';
                ctx.beginPath();
                ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Player ship
            ctx.drawImage(ships[playerDir], playerX, playerY, SPRITE_SIZE, SPRITE_SIZE);

            // Controls toggle indicator
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
