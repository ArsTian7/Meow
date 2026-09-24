/* ============================================
   喵喵糖果屋 - 核心脚本
   功能：Canvas 粒子特效、Web Audio 喵叫音效、交互控制
   ============================================ */

// ==========================================
// 一、配置常量
// ==========================================
var CONFIG = {
    MAX_PARTICLES: 600,           // 最大粒子数量上限
    MIN_TYPES: 1,                 // 每次点击最少粒子种类
    MAX_TYPES: 3,                 // 每次点击最多粒子种类
    MIN_PER_TYPE: 8,              // 每种粒子最少数量
    MAX_PER_TYPE: 15,             // 每种粒子最多数量
    AUDIO_PATHS: [                // 喵叫音频文件路径（相对路径）
        './assets/audio/meow1.mp3',
        './assets/audio/meow2.mp3',
        './assets/audio/meow3.mp3',
        './assets/audio/meow4.mp3',
        './assets/audio/meow5.mp3'
    ],
    COLORS: [                     // 粒子可用颜色（粉、薄荷蓝、奶油黄、紫、彩虹色）
        '#FF6B9D', '#FF85B3', '#FFB3D1',   // 粉色系
        '#7FDBCA', '#A8E6CF', '#B5EAD7',   // 薄荷蓝系
        '#FFE66D', '#FFF3B0', '#FFD93D',   // 奶油黄系
        '#B088E8', '#C9A8F5', '#D4BBFF',   // 紫色系
        '#FF6B6B', '#4ECDC4', '#45B7D1',   // 彩虹色
        '#96CEB4', '#FFEAA7', '#DDA0DD',   // 彩虹色
        '#FF9FF3', '#54A0FF', '#5F27CD'    // 彩虹色
    ],
    RAINBOW: [                    // 彩虹渐变色
        '#FF6B6B', '#FF9F43', '#FFE66D',
        '#4ECDC4', '#45B7D1', '#54A0FF', '#B088E8'
    ],
    BUBBLE_COUNT: 15              // 背景装饰泡泡数量
};

// ==========================================
// 二、全局状态
// ==========================================
var canvas, ctx;                  // Canvas 元素和 2D 上下文
var particles = [];               // 活跃粒子数组
var clickCount = 0;               // 点击喵叫计数
var isMuted = false;              // 是否静音
var audioCtx = null;              // Web AudioContext（延迟初始化）
var audioBuffers = [];            // 预加载的音频 AudioBuffer 数组
var audioLoaded = false;          // 是否有至少一个音频成功加载
var pointerStartX = 0;           // pointerdown 时的 X 坐标
var pointerStartY = 0;           // pointerdown 时的 Y 坐标
var dpr = 1;                     // 设备像素比

// ==========================================
// 三、音频管理器
// ==========================================

/**
 * 初始化 AudioContext 并预加载音频文件
 * 必须在用户交互（click/touch）后调用，否则浏览器可能拒绝播放
 */
function initAudio() {
    try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        audioCtx = new AudioCtx();

        // 逐个尝试加载音频文件
        var loadCount = 0;
        var totalCount = CONFIG.AUDIO_PATHS.length;

        CONFIG.AUDIO_PATHS.forEach(function(path, index) {
            fetch(path)
                .then(function(response) {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.arrayBuffer();
                })
                .then(function(data) {
                    return audioCtx.decodeAudioData(data);
                })
                .then(function(buffer) {
                    audioBuffers[index] = buffer;
                    audioLoaded = true;
                    loadCount++;
                })
                .catch(function() {
                    // 单个文件加载失败，静默忽略
                    loadCount++;
                });
        });
    } catch (e) {
        // AudioContext 创建失败，静默忽略
    }
}

/**
 * 恢复被挂起的 AudioContext（浏览器自动播放策略要求）
 */
function resumeAudioContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

/**
 * 播放随机喵叫音效
 * 优先使用预加载的真实音频，失败时自动降级为 Web Audio 合成音效
 */
function playMeow() {
    if (isMuted) return;
    resumeAudioContext();
    if (!audioCtx) return;

    // 尝试播放真实音频
    if (audioLoaded) {
        // 随机选一个已加载的音频
        var loadedIndices = [];
        for (var i = 0; i < audioBuffers.length; i++) {
            if (audioBuffers[i]) loadedIndices.push(i);
        }
        if (loadedIndices.length > 0) {
            var idx = loadedIndices[Math.floor(Math.random() * loadedIndices.length)];
            try {
                playBufferMeow(audioBuffers[idx]);
                return;
            } catch (e) {
                // 播放失败，降级到合成音效
            }
        }
    }

    // 降级：使用 Web Audio API 合成电子喵
    playSynthMeow();
}

/**
 * 播放预加载的 AudioBuffer
 */
function playBufferMeow(buffer) {
    var source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // 随机音调（playbackRate）
    source.playbackRate.value = 0.85 + Math.random() * 0.3;

    // 随机音量
    var gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.4 + Math.random() * 0.4;

    // 随机左右声道偏移
    var panner = audioCtx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.2;

    // 轻微回声效果（DelayNode）
    var delay = audioCtx.createDelay();
    delay.delayTime.value = 0.08 + Math.random() * 0.07;
    var delayGain = audioCtx.createGain();
    delayGain.gain.value = 0.2;

    // 连接主路径：source → gain → panner → destination
    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(audioCtx.destination);

    // 连接回声路径：panner → delay → delayGain → destination
    panner.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(audioCtx.destination);

    source.start(0);
}

/**
 * 使用 Web Audio API 合成"电子喵"占位音效
 * 模拟猫叫的频率滑动特征
 */
function playSynthMeow() {
    if (!audioCtx) return;
    var now = audioCtx.currentTime;

    // 随机化喵叫参数
    var baseFreq = 400 + Math.random() * 250;
    var peakFreq = baseFreq + 250 + Math.random() * 200;
    var endFreq = baseFreq * (0.5 + Math.random() * 0.3);
    var duration = 0.18 + Math.random() * 0.18;

    // 主振荡器（模拟猫叫频率滑动）
    var osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(peakFreq, now + duration * 0.25);
    osc.frequency.linearRampToValueAtTime(endFreq, now + duration);

    // 主增益包络（快速起音、自然衰减）
    var mainGain = audioCtx.createGain();
    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.15, now + 0.02);
    mainGain.gain.linearRampToValueAtTime(0.001, now + duration);

    // 第二谐波（增加音色丰富度）
    var osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2, now);
    osc2.frequency.linearRampToValueAtTime(peakFreq * 1.8, now + duration * 0.25);
    osc2.frequency.linearRampToValueAtTime(endFreq * 1.5, now + duration);

    var harmGain = audioCtx.createGain();
    harmGain.gain.setValueAtTime(0.001, now);
    harmGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    harmGain.gain.linearRampToValueAtTime(0.001, now + duration);

    // 立体声偏移
    var panner = audioCtx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.2;

    // 回声效果
    var delay = audioCtx.createDelay();
    delay.delayTime.value = 0.09 + Math.random() * 0.06;
    var delayGain = audioCtx.createGain();
    delayGain.gain.value = 0.15;

    // 连接路径
    osc.connect(mainGain);
    mainGain.connect(panner);
    osc2.connect(harmGain);
    harmGain.connect(panner);
    panner.connect(audioCtx.destination);

    // 回声路径
    panner.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.1);
    osc2.start(now);
    osc2.stop(now + duration + 0.1);
}

// ==========================================
// 四、工具函数
// ==========================================

/** 随机选取一个颜色 */
function randColor() {
    return CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
}

/** 随机选取一个彩虹色 */
function randRainbow() {
    return CONFIG.RAINBOW[Math.floor(Math.random() * CONFIG.RAINBOW.length)];
}

/** 返回范围内随机浮点数 */
function randRange(min, max) {
    return min + Math.random() * (max - min);
}

/** 返回范围内随机整数 */
function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
}

// ==========================================
// 五、粒子绘制函数
// ==========================================

/**
 * 绘制糖果粒子（带条纹的椭圆糖果）
 */
function drawCandy(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    // 糖果主体（椭圆）
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 糖果条纹
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.5, p.size * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    // 左端包装纸
    ctx.beginPath();
    ctx.moveTo(-p.size, -p.size * 0.3);
    ctx.lineTo(-p.size * 1.5, -p.size * 0.6);
    ctx.lineTo(-p.size * 1.4, 0);
    ctx.lineTo(-p.size * 1.5, p.size * 0.6);
    ctx.lineTo(-p.size, p.size * 0.3);
    ctx.closePath();
    ctx.fillStyle = p.color2 || p.color;
    ctx.fill();

    // 右端包装纸
    ctx.beginPath();
    ctx.moveTo(p.size, -p.size * 0.3);
    ctx.lineTo(p.size * 1.5, -p.size * 0.6);
    ctx.lineTo(p.size * 1.4, 0);
    ctx.lineTo(p.size * 1.5, p.size * 0.6);
    ctx.lineTo(p.size, p.size * 0.3);
    ctx.closePath();
    ctx.fillStyle = p.color2 || p.color;
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制棒棒糖粒子（圆形 + 螺旋纹 + 棍子）
 */
function drawLollipop(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var r = p.size;

    // 棍子
    ctx.beginPath();
    ctx.moveTo(0, r * 0.5);
    ctx.lineTo(0, r * 2.2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 糖果圆形底
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 螺旋纹（用弧线模拟）
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
        var angle = (i / 3) * Math.PI * 2;
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r * (0.3 + i * 0.25), angle, angle + Math.PI * 0.8);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
}

/**
 * 绘制爱心粒子（贝塞尔曲线）
 */
function drawHeart(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.4);
    ctx.bezierCurveTo(-s, -s * 0.2, -s, -s, 0, -s * 0.5);
    ctx.bezierCurveTo(s, -s, s, -s * 0.2, 0, s * 0.4);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();

    // 高光
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.4, s * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制五角星粒子
 */
function drawStar(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var outer = p.size;
    var inner = outer * 0.4;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
        var r = (i % 2 === 0) ? outer : inner;
        var angle = (Math.PI / 5) * i - Math.PI / 2;
        var px = Math.cos(angle) * r;
        var py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();

    // 发光效果
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.size * 0.6;
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制泡泡粒子（半透明圆圈 + 高光）
 */
function drawBubble(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = p.alpha * 0.6;

    var r = p.size;

    // 泡泡主体（半透明）
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha * 0.15;
    ctx.fill();

    // 泡泡边框
    ctx.globalAlpha = p.alpha * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 高光点
    ctx.globalAlpha = p.alpha * 0.7;
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制猫爪粒子（一个大垫 + 四个小趾垫）
 */
function drawCatPaw(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size;
    var padColor = p.color;

    // 主肉垫
    ctx.beginPath();
    ctx.ellipse(0, s * 0.2, s * 0.45, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = padColor;
    ctx.fill();

    // 四个小趾垫
    var toePositions = [
        [-s * 0.35, -s * 0.2],
        [-s * 0.12, -s * 0.4],
        [s * 0.12, -s * 0.4],
        [s * 0.35, -s * 0.2]
    ];
    for (var i = 0; i < toePositions.length; i++) {
        ctx.beginPath();
        ctx.arc(toePositions[i][0], toePositions[i][1], s * 0.17, 0, Math.PI * 2);
        ctx.fillStyle = padColor;
        ctx.fill();
    }

    ctx.restore();
}

/**
 * 绘制闪光粒子（四角星芒）
 */
function drawSparkle(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size;

    // 四角星芒
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.15, -s * 0.15, s, 0);
    ctx.quadraticCurveTo(s * 0.15, s * 0.15, 0, s);
    ctx.quadraticCurveTo(-s * 0.15, s * 0.15, -s, 0);
    ctx.quadraticCurveTo(-s * 0.15, -s * 0.15, 0, -s);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();

    // 中心高光
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制蝴蝶结粒子
 */
function drawBow(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size;

    // 左翼
    ctx.beginPath();
    ctx.ellipse(-s * 0.5, 0, s * 0.55, s * 0.35, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 右翼
    ctx.beginPath();
    ctx.ellipse(s * 0.5, 0, s * 0.55, s * 0.35, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 中心结
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = p.color2 || '#fff';
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制甜甜圈粒子
 */
function drawDonut(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var r = p.size;

    // 甜甜圈主体（环形）
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2, true);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 糖霜（上半圈浅色）
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, Math.PI * 2);
    ctx.arc(0, 0, r * 0.4, Math.PI * 2, Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    // 彩色糖粒
    var sprinkleColors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#B088E8', '#FF9FF3'];
    for (var i = 0; i < 5; i++) {
        var angle = Math.PI + (i / 5) * Math.PI + 0.2;
        var dist = r * 0.7;
        ctx.beginPath();
        ctx.arc(
            Math.cos(angle) * dist,
            Math.sin(angle) * dist,
            r * 0.08,
            0, Math.PI * 2
        );
        ctx.fillStyle = sprinkleColors[i];
        ctx.fill();
    }

    ctx.restore();
}

/**
 * 绘制彩虹拖尾粒子（弧形彩虹条）
 */
function drawRainbowTrail(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size;
    var colors = CONFIG.RAINBOW;
    var arcCount = colors.length;

    // 绘制多条同心弧线形成彩虹
    for (var i = 0; i < arcCount; i++) {
        ctx.beginPath();
        var radius = s * (0.5 + i * 0.12);
        ctx.arc(0, 0, radius, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    ctx.restore();
}

// 粒子类型名到绘制函数的映射
var PARTICLE_DRAW = {
    candy: drawCandy,
    lollipop: drawLollipop,
    heart: drawHeart,
    star: drawStar,
    bubble: drawBubble,
    catPaw: drawCatPaw,
    sparkle: drawSparkle,
    bow: drawBow,
    donut: drawDonut,
    rainbowTrail: drawRainbowTrail
};

var PARTICLE_TYPES = Object.keys(PARTICLE_DRAW);

// ==========================================
// 六、粒子系统（生成、更新、回收）
// ==========================================

/**
 * 在指定位置生成一组随机粒子
 * @param {number} x - 点击位置 X 坐标
 * @param {number} y - 点击位置 Y 坐标
 */
function spawnParticles(x, y) {
    // 随机决定本次使用几种粒子类型
    var typeCount = randInt(CONFIG.MIN_TYPES, CONFIG.MAX_TYPES);
    var usedTypes = [];

    // 从可用类型中不重复地选取
    var available = PARTICLE_TYPES.slice();
    for (var t = 0; t < typeCount && available.length > 0; t++) {
        var idx = Math.floor(Math.random() * available.length);
        usedTypes.push(available[idx]);
        available.splice(idx, 1);
    }

    // 为每种类型生成若干粒子
    for (var ti = 0; ti < usedTypes.length; ti++) {
        var type = usedTypes[ti];
        var count = randInt(CONFIG.MIN_PER_TYPE, CONFIG.MAX_PER_TYPE);

        for (var i = 0; i < count; i++) {
            // 如果超过上限，移除最旧的粒子
            while (particles.length >= CONFIG.MAX_PARTICLES) {
                particles.shift();
            }

            var angle = Math.random() * Math.PI * 2;
            var speed;

            // 根据粒子类型决定运动模式
            if (type === 'bubble') {
                // 泡泡：缓慢上浮
                speed = randRange(0.5, 1.5);
            } else if (type === 'rainbowTrail') {
                // 彩虹拖尾：中速扩散
                speed = randRange(2, 5);
            } else {
                // 其他：爆裂散开
                speed = randRange(2, 8);
            }

            var particle = {
                type: type,
                x: x + randRange(-5, 5),
                y: y + randRange(-5, 5),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: randRange(6, 18),
                alpha: 1,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: randRange(-0.08, 0.08),
                life: 1,
                decay: randRange(0.008, 0.02),
                color: randColor(),
                color2: randColor(),
                gravity: (type === 'bubble') ? -0.02 : 0.06,
                friction: 0.985,
                scalePhase: Math.random() * Math.PI * 2,
                trail: (type === 'rainbowTrail')
            };

            particles.push(particle);
        }
    }
}

/**
 * 更新所有粒子状态（位置、生命周期、透明度等）
 */
function updateParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];

        // 更新速度（含摩擦力和重力）
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;

        // 更新位置
        p.x += p.vx;
        p.y += p.vy;

        // 更新旋转
        p.rotation += p.rotationSpeed;

        // 更新生命周期
        p.life -= p.decay;
        p.alpha = Math.max(0, p.life);

        // 缩放脉动效果（部分粒子类型）
        p.scalePhase += 0.1;

        // 拖尾粒子额外生成小尾迹
        if (p.trail && p.life > 0.3 && Math.random() < 0.3) {
            // 超过上限时不生成尾迹
            if (particles.length < CONFIG.MAX_PARTICLES) {
                particles.push({
                    type: 'sparkle',
                    x: p.x,
                    y: p.y,
                    vx: randRange(-0.5, 0.5),
                    vy: randRange(-0.5, 0.5),
                    size: p.size * 0.3,
                    alpha: p.alpha * 0.6,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: randRange(-0.05, 0.05),
                    life: p.life * 0.4,
                    decay: 0.03,
                    color: randRainbow(),
                    color2: '#fff',
                    gravity: 0.01,
                    friction: 0.99,
                    scalePhase: 0,
                    trail: false
                });
            }
        }

        // 移除已消亡的粒子
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

/**
 * 绘制所有活跃粒子
 */
function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var drawFn = PARTICLE_DRAW[p.type];
        if (drawFn) {
            drawFn(p);
        }
    }
}

// ==========================================
// 七、背景装饰泡泡（纯 DOM + CSS 动画）
// ==========================================

/**
 * 生成背景浮动泡泡装饰元素
 */
function createBackgroundBubbles() {
    var container = document.getElementById('bg-bubbles');
    if (!container) return;

    var bubbleColors = [
        'rgba(255,107,157,0.3)',
        'rgba(127,219,202,0.3)',
        'rgba(255,230,109,0.3)',
        'rgba(176,136,232,0.3)',
        'rgba(255,159,243,0.3)',
        'rgba(84,160,255,0.3)'
    ];

    for (var i = 0; i < CONFIG.BUBBLE_COUNT; i++) {
        var bubble = document.createElement('div');
        bubble.className = 'bubble';

        var size = randRange(10, 50);
        var left = randRange(0, 100);
        var duration = randRange(8, 20);
        var delay = randRange(0, 15);
        var color = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];

        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';
        bubble.style.left = left + '%';
        bubble.style.bottom = '-' + size + 'px';
        bubble.style.background = 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), ' + color + ')';
        bubble.style.animationDuration = duration + 's';
        bubble.style.animationDelay = delay + 's';

        container.appendChild(bubble);
    }
}

// ==========================================
// 八、Canvas 初始化与尺寸管理
// ==========================================

/**
 * 初始化 Canvas 或在其尺寸变化时重新计算
 * 支持高 DPI 屏幕（devicePixelRatio）
 */
function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ==========================================
// 九、UI 交互控制
// ==========================================

/**
 * 更新点击计数显示
 */
function updateCounter() {
    clickCount++;
    var counterNum = document.getElementById('counter-num');
    if (counterNum) {
        counterNum.textContent = clickCount;
        // 触发弹跳动画
        counterNum.classList.remove('pop');
        // 强制回流以重新触发动画
        void counterNum.offsetWidth;
        counterNum.classList.add('pop');
    }
}

/**
 * 切换音量静音状态
 */
function toggleMute() {
    isMuted = !isMuted;
    var btn = document.getElementById('volume-btn');
    if (btn) {
        btn.textContent = isMuted ? '🔇' : '🔊';
    }
}

/**
 * 触发内容区域的轻微弹跳反馈
 */
function triggerBounce() {
    var content = document.getElementById('content');
    if (content) {
        content.classList.remove('bounce');
        void content.offsetWidth;
        content.classList.add('bounce');
    }
}

/**
 * 检查元素或其祖先是否带有 data-no-effect 属性
 */
function hasNoEffect(el) {
    while (el && el !== document.body) {
        if (el.hasAttribute && el.hasAttribute('data-no-effect')) {
            return true;
        }
        el = el.parentElement;
    }
    return false;
}

// ==========================================
// 十、事件绑定
// ==========================================

function bindEvents() {
    // 使用 pointerdown 统一处理鼠标和触摸事件
    document.addEventListener('pointerdown', function(e) {
        // 只响应主指针（左键/触摸），忽略右键和其他按钮
        if (e.button !== 0) return;
        if (e.isPrimary === false) return;

        // 记录按下位置（用于检测拖动）
        pointerStartX = e.clientX;
        pointerStartY = e.clientY;
    }, { passive: true });

    document.addEventListener('pointerup', function(e) {
        // 只响应主指针
        if (e.button !== 0) return;
        if (e.isPrimary === false) return;

        // 计算移动距离，超过阈值视为拖动，不触发特效
        var dx = e.clientX - pointerStartX;
        var dy = e.clientY - pointerStartY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) return;

        // 检查点击目标是否在 data-no-effect 区域内
        if (hasNoEffect(e.target)) return;

        // 首次交互时初始化音频（满足浏览器自动播放策略）
        if (!audioCtx) {
            initAudio();
        }

        var x = e.clientX;
        var y = e.clientY;

        // 生成粒子特效
        spawnParticles(x, y);

        // 播放喵叫音效
        playMeow();

        // 更新计数
        updateCounter();

        // 轻微屏幕弹跳反馈
        triggerBounce();
    }, { passive: true });

    // 阻止右键菜单（避免右键点击干扰）
    document.addEventListener('contextmenu', function(e) {
        // 允许 UI 按钮上的右键
        if (hasNoEffect(e.target)) return;
        e.preventDefault();
    });

    // 窗口大小变化时重新计算 Canvas 尺寸
    window.addEventListener('resize', function() {
        resizeCanvas();
    });

    // 音量按钮点击
    var volumeBtn = document.getElementById('volume-btn');
    if (volumeBtn) {
        volumeBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            toggleMute();
        });
    }
}

// ==========================================
// 十一、主动画循环
// ==========================================

/**
 * requestAnimationFrame 驱动的主循环
 * 每帧清除画布、更新并绘制所有粒子
 */
function animate() {
    // 清除整个画布
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // 更新粒子状态
    updateParticles();

    // 绘制所有粒子
    drawParticles();

    // 请求下一帧
    requestAnimationFrame(animate);
}

// ==========================================
// 十二、初始化入口
// ==========================================

/**
 * 页面加载完成后初始化所有系统
 */
function init() {
    // 获取 Canvas 和上下文
    canvas = document.getElementById('canvas');
    if (!canvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');

    // 初始化 Canvas 尺寸
    resizeCanvas();

    // 生成背景装饰泡泡
    createBackgroundBubbles();

    // 绑定交互事件
    bindEvents();

    // 启动动画循环
    animate();
}

// DOM 加载完成后启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
