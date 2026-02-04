// --- 1. FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyBbdRgcZmqt5-ywPyssZ1C2CDoj11slDQs",
    authDomain: "sky-dodge-8f537.firebaseapp.com",
    databaseURL: "https://sky-dodge-8f537-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sky-dodge-8f537",
    storageBucket: "sky-dodge-8f537.firebasestorage.app",
    messagingSenderId: "169224412363",
    appId: "1:169224412363:web:de0d018158d8b34e854f4e"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// --- 2. BIẾN TOÀN CỤC ---
const urlParams = new URLSearchParams(window.location.search);
const hostId = urlParams.get('id');
let isHost = false;
let gameOver = false;
let seconds = 0;
let score = 0;
let baseSpeed = 5;

const paddle = document.getElementById('paddle');
const msg = document.getElementById('msg');
const statsContent = document.getElementById('stats-content');
const currentMax = parseInt(localStorage.getItem('paddleCapacity')) || 100;
const coinImg = 'https://drive.google.com/thumbnail?id=13GfXHlWxw_dlc3eWxlO4p5D5HY1n361H&sz=w100';

// Khởi tạo giao diện ván
paddle.style.background = localStorage.getItem('paddleColor') || 'rgba(255, 255, 255, 0.4)';
paddle.style.width = localStorage.getItem('paddleWidth') || '130px';
document.getElementById('max-num').innerText = currentMax;

// --- 3. ĐỒNG BỘ TRẠNG THÁI ---
auth.onAuthStateChanged(user => {
    if (!user || !hostId) return window.location.href = "auth.html";
    isHost = (user.uid === hostId);
    
    // Reset trạng thái khi vào trận
    db.ref(`rooms/${hostId}/players/${user.uid}`).update({ 
        state: 'alive', 
        survivalTime: 0 
    });

    // Lắng nghe tín hiệu kết thúc từ Host
    db.ref(`rooms/${hostId}/status`).on('value', snap => {
        if (snap.val() === 'finished') renderWinnerBoard();
    });

    if (isHost) hostLogic();
});

// --- 4. LOGIC GAMEPLAY ---
const itemTypes = [
    { url: 'https://drive.google.com/thumbnail?id=1SGW0oc5yuw1WmArQ9GbNSQYBPbmXRWdi&sz=w200', chance: 65, weight: 1, type: 'normal' },
    { url: 'https://drive.google.com/thumbnail?id=17JZiAW3NHJvEg2iN679TdNB_DVlKN7xz&sz=w200', chance: 20, weight: 2, type: 'normal' },
    { url: 'https://drive.google.com/thumbnail?id=1KeXUOKM47cK2pO6UNCfvygAOiMARMaH1&sz=w200', chance: 10, weight: 3, type: 'normal' },
    { url: 'https://drive.google.com/thumbnail?id=1IKc60y8Dn1ouIsFFzYw22oIcHM0Oxnjk&sz=w200', chance: 5, weight: 0, type: 'danger' }
];

function move(x) {
    if (gameOver) return;
    let rect = document.getElementById('game-container').getBoundingClientRect();
    let xPos = Math.max(paddle.offsetWidth/2, Math.min(x - rect.left, rect.width - paddle.offsetWidth/2));
    paddle.style.left = xPos + 'px';
}
window.addEventListener('mousemove', e => move(e.clientX));
window.addEventListener('touchmove', e => { e.preventDefault(); move(e.touches[0].clientX); }, {passive: false});

// Bộ đếm giây và tăng tốc độ rơi
setInterval(() => { 
    if (!gameOver) { 
        seconds++; 
        document.getElementById('timer').innerText = seconds; 
        if(seconds % 5 === 0) baseSpeed += 0.5; 
    } 
}, 1000);

function createItem() {
    if (gameOver) return;
    let rand = Math.random() * 100, cum = 0, sel = itemTypes[0];
    for (let t of itemTypes) { cum += t.chance; if (rand < cum) { sel = t; break; } }
    
    const item = document.createElement('img');
    item.src = sel.url; item.className = 'falling-item';
    item.style.left = Math.random() * (document.getElementById('game-container').offsetWidth - 60) + 'px';
    item.style.top = '-60px';
    document.getElementById('game-container').appendChild(item);

    let top = -60, speed = baseSpeed + Math.random() * 2;
    const fall = setInterval(() => {
        if (gameOver) { clearInterval(fall); item.remove(); return; }
        top += speed; item.style.top = top + 'px';
        const p = paddle.getBoundingClientRect(), i = item.getBoundingClientRect();
        if (i.bottom >= p.top && i.right >= p.left && i.left <= p.right && i.top <= p.bottom) {
            clearInterval(fall); item.remove();
            if (sel.type === 'danger') return onDeath("CHẠM VẬT CẤM");
            score += sel.weight;
            document.getElementById('num').innerText = score;
            document.getElementById('bar').style.width = Math.min((score/currentMax)*100, 100) + '%';
            if (score >= currentMax) onDeath("QUÁ TẢI");
        }
        if (top > window.innerHeight) { clearInterval(fall); item.remove(); }
    }, 20);
}

function spawn() { if(!gameOver) { createItem(); setTimeout(spawn, Math.max(200, 800 - seconds*10)); } }
spawn();

// --- 5. XỬ LÝ KẾT THÚC VÀ PHÂN XỬ THẮNG THUA ---
function onDeath(reason) {
    if (gameOver) return;
    gameOver = true; 
    paddle.style.background = '#555';
    db.ref(`rooms/${hostId}/players/${auth.currentUser.uid}`).update({ 
        state: 'dead', 
        survivalTime: seconds 
    });
    msg.style.display = 'block';
    statsContent.innerHTML = `<p style="color:red; font-weight:bold;">${reason}</p><p>Trụ được ${seconds}s. Chờ đối thủ...</p>`;
}

function hostLogic() {
    db.ref(`rooms/${hostId}/players`).on('value', async snap => {
        const players = snap.val(); if (!players || !isHost || gameOver) return;
        const entries = Object.entries(players);
        const alive = entries.filter(p => p[1].state === 'alive');
        
        if (alive.length === 1 || (alive.length === 0 && entries.length > 0)) {
            const winner = alive.length === 1 ? alive[0] : entries.sort((a,b) => b[1].survivalTime - a[1].survivalTime)[0];
            const prizeSnap = await db.ref(`rooms/${hostId}/totalPrize`).once('value');
            const prize = prizeSnap.val() || 0;

            db.ref().update({
                [`users/${winner[0]}/coins`]: firebase.database.ServerValue.increment(prize),
                [`rooms/${hostId}/status`]: 'finished',
                [`rooms/${hostId}/winnerInfo`]: { name: winner[1].name, prize: prize }
            });
        }
    });
}

async function renderWinnerBoard() {
    gameOver = true;
    const snap = await db.ref(`rooms/${hostId}`).once('value');
    const data = snap.val();
    if (!data) return;
    const winner = data.winnerInfo || { name: "N/A", prize: 0 };
    
    let html = `<h2 style="color:#ffeb3b">WINNER: ${winner.name}</h2>
                <p style="font-size:22px; color:#2ecc71;">+${winner.prize} <img src="${coinImg}" class="coin-icon"></p><hr>`;
    
    Object.values(data.players).sort((a,b) => (b.survivalTime||0)-(a.survivalTime||0)).forEach(p => {
        html += `<div style="display:flex;justify-content:space-between;margin:8px 0">
                    <span>${p.name}</span>
                    <span>${p.survivalTime||0}s</span>
                 </div>`;
    });

    if(document.getElementById('msg-title')) document.getElementById('msg-title').innerText = "KẾT QUẢ";
    statsContent.innerHTML = html;
    document.getElementById('end-actions').style.display = 'block';
    document.getElementById('back-btn').onclick = () => location.href = 'room.html?id=' + hostId;
    msg.style.display = 'block';
}
