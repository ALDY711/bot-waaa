const fs = require('fs');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

const GAME_HTML = `<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; box-sizing: border-box; margin: 0; padding: 0; }
body { margin: 0; background: transparent; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #fff; touch-action: none; overflow: hidden; }
.wrapper { width: 100%; max-width: 480px; margin: auto; padding: 12px; }
.card { background: linear-gradient(180deg, rgba(15,18,26,0.97), rgba(10,12,18,0.97)); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 2px solid #3b82f6; border-radius: 20px; overflow: hidden; box-shadow: 0 14px 44px rgba(0,0,0,0.75), inset 0 0 40px rgba(59,130,246,0.1); padding: 14px; position: relative; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.title { font-size: 10px; letter-spacing: 1.5px; color: #60a5fa; font-weight: 800; text-transform: uppercase; display:flex; align-items:center; gap:6px; }
.title .dot{ width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981; animation: pulse 1.4s infinite; }
@keyframes pulse{ 0%,100%{opacity:1} 50%{opacity:.3} }
.score-badge { font-size: 20px; font-weight: 900; color: #60a5fa; text-shadow: 0 0 12px rgba(96,165,250,0.5); font-variant-numeric: tabular-nums; }
.best-badge { font-size: 10px; color: #94a3b8; font-variant-numeric: tabular-nums; }
.stat-row { display:flex; gap:8px; margin-bottom:8px; }
.stat-pill { flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:5px 8px; text-align:center; }
.stat-pill .lbl{ font-size:8px; letter-spacing:1px; color:#64748b; text-transform:uppercase; font-weight:700; }
.stat-pill .val{ font-size:13px; font-weight:900; color:#fff; font-variant-numeric: tabular-nums; }
#game-container { position: relative; width: 100%; height: 350px; border-radius: 14px; overflow: hidden; border: 2px solid #1e293b; box-shadow: inset 0 0 30px rgba(0,0,0,0.6); }
canvas { width: 100%; height: 100%; display: block; background: #070a12; }
.controls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.btn { padding: 14px; font-size: 15px; font-weight: 800; border: none; border-radius: 12px; cursor: pointer; color: #fff; text-align: center; letter-spacing: 0.5px; position: relative; overflow: hidden; }
.btn-left { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 4px 16px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.2); }
.btn-right { background: linear-gradient(135deg, #ec4899, #db2777); box-shadow: 0 4px 16px rgba(236,72,153,0.45), inset 0 1px 0 rgba(255,255,255,0.2); }
.btn:active { transform: scale(0.95); filter: brightness(0.9); }
.credit-bar { margin-top: 10px; text-align: center; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; color: #94a3b8; text-transform: uppercase; border-top: 1px dashed rgba(255,255,255,0.12); padding-top: 8px; }
.credit-bar span { color: #60a5fa; text-shadow: 0 0 10px rgba(96,165,250,0.5); }
</style>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <div>
        <div class="title"><span class="dot"></span>ALDY</div>
        <h2 style="font-size: 17px; font-weight: 900; color: #fff; margin-top:2px;">Space Rush 🚀</h2>
      </div>
      <div style="text-align: right;">
        <div class="score-badge" id="score">0000</div>
        <div class="best-badge" id="best">BEST 0000</div>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat-pill"><div class="lbl">Kills</div><div class="val" id="killsStat">0</div></div>
      <div class="stat-pill"><div class="lbl">Combo</div><div class="val" id="comboStat">x1</div></div>
      <div class="stat-pill"><div class="lbl">Coins</div><div class="val" id="coinsStat">0</div></div>
    </div>

    <div id="game-container">
      <canvas id="c"></canvas>
    </div>

    <div class="controls">
      <button class="btn btn-left" id="leftBtn">⬅️ LEFT</button>
      <button class="btn btn-right" id="rightBtn">RIGHT ➡️</button>
    </div>

    <div class="credit-bar">
      Engineered by <span>ALDY</span> ⚡
    </div>
  </div>
</div>

<script>
(function() {
  var cvs = document.getElementById('c');
  var ctx = cvs.getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var killsStatEl = document.getElementById('killsStat');
  var comboStatEl = document.getElementById('comboStat');
  var coinsStatEl = document.getElementById('coinsStat');

  var W = 360;
  var H = 350;
  cvs.width = W;
  cvs.height = H;

  var ROAD_L = 20, ROAD_R = W - 20;
  var laneCount = 4;
  var laneW = (ROAD_R - ROAD_L) / laneCount;
  var lanes = [];
  for (var li = 0; li < laneCount; li++) lanes.push(ROAD_L + laneW * (li + 0.5));

  var currentLane = 1;
  var targetX = lanes[currentLane];
  var playerX = lanes[currentLane];
  var playerY = H - 65;

  var score = 0;
  var best = 0;
  var kills = 0;
  var coinCount = 0;
  var combo = 1;
  var comboTimer = 0;
  var shake = 0;
  var flashAlpha = 0;

  try { best = parseInt(localStorage.getItem('plane_best_v1') || '0', 10) || 0; } catch(e){}
  bestEl.textContent = 'BEST ' + String(best).padStart(4, '0');

  var bullets = [];
  var enemies = [];
  var coins = [];
  var particles = [];
  var stars = [];
  var gameOver = false;
  var shootTimer = 0;

  for (var s = 0; s < 40; s++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, size: Math.random() * 2 + 1, speed: Math.random() * 2 + 1 });
  }

  function spawnEnemy() {
    var laneIdx = Math.floor(Math.random() * laneCount);
    var isMeteor = Math.random() < 0.45;
    enemies.push({
      lane: laneIdx,
      x: lanes[laneIdx],
      y: -40,
      w: isMeteor ? 34 : 28,
      h: isMeteor ? 34 : 32,
      hp: isMeteor ? 999 : 1,
      isMeteor: isMeteor,
      speed: isMeteor ? 2.2 + Math.random() * 1.5 : 1.8 + Math.random() * 1.2
    });
  }

  function explode(x, y, color, count) {
    count = count || 20;
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var spd = 1 + Math.random() * 5;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: color,
        life: 1,
        size: 2 + Math.random() * 3
      });
    }
  }

  function drawSpaceCraft(x, y) {
    ctx.save();
    ctx.translate(x, y);

    var flameH = 12 + Math.random() * 8;
    var gradFlame = ctx.createLinearGradient(0, 15, 0, 15 + flameH);
    gradFlame.addColorStop(0, '#38bdf8');
    gradFlame.addColorStop(0.5, '#f59e0b');
    gradFlame.addColorStop(1, 'transparent');
    ctx.fillStyle = gradFlame;
    
    ctx.fillRect(-10, 15, 5, flameH);
    ctx.fillRect(5, 15, 5, flameH);

    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(-12, 10);
    ctx.lineTo(-20, 18);
    ctx.lineTo(-8, 15);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(12, 10);
    ctx.lineTo(20, 18);
    ctx.lineTo(8, 15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(26, 12);
    ctx.lineTo(12, 14);
    ctx.lineTo(0, 8);
    ctx.lineTo(-12, 14);
    ctx.lineTo(-26, 12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-26, 12);
    ctx.lineTo(0, -10);
    ctx.lineTo(26, 12);
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-12, 2, 4, 12);
    ctx.fillRect(8, 2, 4, 12);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-25, 5, 2, 8);
    ctx.fillRect(23, 5, 2, 8);

    var gradBody = ctx.createLinearGradient(0, -28, 0, 16);
    gradBody.addColorStop(0, '#e0f2fe');
    gradBody.addColorStop(0.4, '#38bdf8');
    gradBody.addColorStop(1, '#1e40af');
    ctx.fillStyle = gradBody;
    
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(7, -8);
    ctx.lineTo(6, 16);
    ctx.lineTo(-6, 16);
    ctx.lineTo(-7, -8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.ellipse(0, -6, 3.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-1, -8, 1, 3, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawMeteor(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var points = 7;
    for (var i = 0; i < points; i++) {
      var angle = (i / points) * Math.PI * 2;
      var r = size / 2 + ((i % 2 === 0) ? 3 : -3);
      var px = Math.cos(angle) * r;
      var py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawAlien(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#059669';
    ctx.fillRect(-14, 2, 28, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -4, 4, 4);
    ctx.fillRect(1, -4, 4, 4);
    ctx.restore();
  }

  var spawnCounter = 0;

  function update() {
    ctx.save();
    if (shake > 0) {
      var sx = (Math.random() - 0.5) * shake;
      var sy = (Math.random() - 0.5) * shake;
      ctx.translate(sx, sy);
      shake *= 0.88;
      if (shake < 0.5) shake = 0;
    }

    ctx.clearRect(-10, -10, W + 20, H + 20);

    ctx.fillStyle = '#ffffff';
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      if (!gameOver) st.y = (st.y + st.speed) % H;
      ctx.globalAlpha = Math.random() * 0.5 + 0.5;
      ctx.fillRect(st.x, st.y, st.size, st.size);
    }
    ctx.globalAlpha = 1;

    if (!gameOver) {
      playerX += (targetX - playerX) * 0.25;

      shootTimer++;
      if (shootTimer >= 10) {
        bullets.push({ x: playerX - 12, y: playerY - 10, speed: 8 });
        bullets.push({ x: playerX + 12, y: playerY - 10, speed: 8 });
        shootTimer = 0;
      }

      spawnCounter++;
      if (spawnCounter > 35) {
        spawnEnemy();
        spawnCounter = 0;
      }

      if (comboTimer > 0) comboTimer--; else if (combo > 1) combo = 1;
    }

    ctx.fillStyle = '#38bdf8';
    for (var b = bullets.length - 1; b >= 0; b--) {
      var bl = bullets[b];
      if (!gameOver) bl.y -= bl.speed;
      ctx.fillRect(bl.x - 1.5, bl.y, 3, 10);

      if (bl.y < -10) bullets.splice(b, 1);
    }

    for (var e = enemies.length - 1; e >= 0; e--) {
      var en = enemies[e];
      if (!gameOver) en.y += en.speed;

      if (en.isMeteor) {
        drawMeteor(en.x, en.y, en.w);
      } else {
        drawAlien(en.x, en.y);
      }

      for (var b = bullets.length - 1; b >= 0; b--) {
        var bl = bullets[b];
        if (Math.abs(bl.x - en.x) < en.w / 2 + 2 && Math.abs(bl.y - en.y) < en.h / 2 + 5) {
          bullets.splice(b, 1);
          en.hp--;
          explode(bl.x, bl.y, en.isMeteor ? '#78350f' : '#10b981', 6);

          if (en.hp <= 0) {
            kills++;
            score += 50 * combo;
            combo = Math.min(combo + 1, 9);
            comboTimer = 90;
            coins.push({ x: en.x, y: en.y, r: 8, spin: 0 });
            explode(en.x, en.y, '#10b981', 15);
            enemies.splice(e, 1);
            break;
          }
        }
      }

      if (!en) continue;

      if (!gameOver && Math.abs(playerX - en.x) < 22 && Math.abs(playerY - en.y) < 22) {
        gameOver = true;
        shake = 12;
        flashAlpha = 0.5;
        explode(playerX, playerY, '#3b82f6', 25);
        explode(en.x, en.y, en.isMeteor ? '#78350f' : '#10b981', 25);
      }

      if (en.y > H + 40) enemies.splice(e, 1);
    }

    for (var c = coins.length - 1; c >= 0; c--) {
      var cn = coins[c];
      if (!gameOver) { cn.y += 2.5; cn.spin += 0.15; }
      var squash = Math.abs(Math.cos(cn.spin));
      ctx.save();
      ctx.translate(cn.x, cn.y);
      ctx.scale(Math.max(0.2, squash), 1);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, cn.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (!gameOver && Math.abs(playerX - cn.x) < 20 && Math.abs(playerY - cn.y) < 20) {
        coinCount++;
        score += 30;
        explode(cn.x, cn.y, '#fbbf24', 8);
        coins.splice(c, 1);
      } else if (cn.y > H + 20) {
        coins.splice(c, 1);
      }
    }

    if (!gameOver) {
      drawSpaceCraft(playerX, playerY);
    }

    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= 0.05;
      if (pt.life <= 0) { particles.splice(p, 1); continue; }
      ctx.globalAlpha = Math.max(pt.life, 0);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (flashAlpha > 0.01) {
      ctx.fillStyle = 'rgba(255,255,255,' + flashAlpha + ')';
      ctx.fillRect(0, 0, W, H);
      flashAlpha *= 0.85;
    }

    scoreEl.textContent = String(score).padStart(4, '0');
    if (score > best) {
      best = score;
      try { localStorage.setItem('plane_best_v1', String(best)); } catch(e){}
      bestEl.textContent = 'BEST ' + String(best).padStart(4, '0');
    }
    killsStatEl.textContent = kills;
    comboStatEl.textContent = 'x' + combo;
    coinsStatEl.textContent = coinCount;

    if (gameOver) {
      ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 24px sans-serif';
      ctx.fillText('DESTROYED 💥', W / 2, H / 2 - 25);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 14px sans-serif';
      ctx.fillText('Score: ' + score, W / 2, H / 2 - 2);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px sans-serif';
      ctx.fillText('Kills: ' + kills + '  •  Coins: ' + coinCount, W / 2, H / 2 + 18);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 12px sans-serif';
      ctx.fillText('TAP TO RESTART', W / 2, H / 2 + 42);
    }

    ctx.restore();
    requestAnimationFrame(update);
  }

  function moveLeft() {
    if (gameOver) return;
    if (currentLane > 0) currentLane--;
    targetX = lanes[currentLane];
  }

  function moveRight() {
    if (gameOver) return;
    if (currentLane < lanes.length - 1) currentLane++;
    targetX = lanes[currentLane];
  }

  function restart() {
    score = 0;
    kills = 0;
    coinCount = 0;
    combo = 1;
    comboTimer = 0;
    bullets = [];
    enemies = [];
    coins = [];
    particles = [];
    currentLane = 1;
    targetX = lanes[currentLane];
    playerX = lanes[currentLane];
    gameOver = false;
  }

  function addTapEvent(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', function(e) { e.preventDefault(); fn(); });
  }

  addTapEvent('leftBtn', moveLeft);
  addTapEvent('rightBtn', moveRight);

  function handleCanvasTap(e) {
    e.preventDefault();
    if (gameOver) { restart(); return; }
    var rect = cvs.getBoundingClientRect();
    var clientX = e.clientX;
    if (e.touches && e.touches.length > 0) clientX = e.touches[0].clientX;
    var clickX = (clientX - rect.left) * (W / rect.width);
    if (clickX < W / 2) moveLeft(); else moveRight();
  }

  cvs.addEventListener('pointerdown', handleCanvasTap);

  update();
})();
</script>
</body>
</html>`;

async function sendSpaceRush(sock, chatId, senderJid = null) {
  const unifiedData = Buffer.from(JSON.stringify({
    response_id: "4db57b2c-8393-484d-8b9a-8e6d1a14b349",
    sections: [
      {
        view_model: {
          primitive: {
            __typename: "GenAIaeacdsnwHtmlPrimitive",
            payload: GAME_HTML,
            trusted_sources: [
              "https://whatsapp.com",
              "https://meta.ai"
            ]
          },
          __typename: "GenAISingleLayoutViewModel"
        }
      }
    ]
  }, null, 2)).toString('base64');

  const messagePayload = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        avatar: null,
        personaId: "867051314767696",
        botResponseId: "b2e40280-433c-45d8-9c1a-270bec558860",
        invokerJid: "13135550002@s.whatsapp.net",
        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: "WA_BOT_MSG",
              signature: Buffer.from("TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==", "base64"),
              certificateChain: [
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg",
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=="
              ]
            }
          ]
        }
      }
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: "AI_RICH_RESPONSE_TYPE_STANDARD",
          submessages: [
            {
              messageType: "AI_RICH_RESPONSE_TEXT",
              messageText: "Space Rush 🚀"
            }
          ],
          unifiedResponse: {
            data: unifiedData
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botName: "Meta AI",
              botJid: "13135550002@s.whatsapp.net",
              creatorName: "Meta"
            },
            forwardOrigin: 4
          }
        }
      }
    }
  };

  const generatedMsg = generateWAMessageFromContent(chatId, messagePayload, {});
  const messageId = generatedMsg.key.id;

  // relayMessage di aldy-baileys otomatis melakukan bypass download edit (type 14)
  return await sock.relayMessage(chatId, generatedMsg.message, { messageId });
}

module.exports = { sendSpaceRush, GAME_HTML };
