/* ============================================
   小天喵喵屋 - 核心脚本
   功能：全屏超大糖果粒子特效、柚子社风格视觉冲击、
         Web Audio 喵呜音效、多层粒子系统
   ============================================ */

// ==========================================
// 一、配置常量
// ==========================================
var CONFIG = {
    MAX_PARTICLES: 250,           // 最大粒子数量上限（手机端大幅降低）
    MIN_TYPES: 1,                 // 每次点击最少粒子种类
    MAX_TYPES: 2,                 // 每次点击最多粒子种类（降低）
    MIN_PER_TYPE: 2,              // 每种粒子最少数量
    MAX_PER_TYPE: 3,              // 每种粒子最多数量
    MAX_DPR: 1.0,                 // 设备像素比上限 1.0（手机端渲染量减半）
    // 超大粒子尺寸配置
    BIG_MIN_SIZE: 30,             // 底层大糖果最小尺寸
    BIG_MAX_SIZE: 55,             // 底层大糖果最大尺寸
    MID_MIN_SIZE: 12,             // 中层星星尺寸
    MID_MAX_SIZE: 22,
    TOP_MIN_SIZE: 3,              // 顶层闪光尺寸
    TOP_MAX_SIZE: 8,
    AUDIO_PATHS: [                // 喵叫音频文件路径（相对路径）
        './assets/audio/meow1.mp3',
        './assets/audio/meow2.mp3',
        './assets/audio/meow3.mp3',
        './assets/audio/meow4.mp3',
        './assets/audio/meow5.mp3'
    ],
    COLORS: [                     // 粒子可用颜色（更饱和的柚子社配色）
        '#FF6B9D', '#FF85B3', '#FFB3D1',   // 粉色系
        '#7FDBCA', '#A8E6CF', '#B5EAD7',   // 薄荷蓝系
        '#FFE66D', '#FFF3B0', '#FFD93D',   // 奶油黄系
        '#B088E8', '#C9A8F5', '#D4BBFF',   // 紫色系
        '#FF6B6B', '#4ECDC4', '#45B7D1',   // 彩虹色
        '#96CEB4', '#FFEAA7', '#DDA0DD',   // 彩虹色
        '#FF9FF3', '#54A0FF', '#FF6348'    // 彩虹色
    ],
    RAINBOW: [                    // 彩虹渐变色
        '#FF6B6B', '#FF9F43', '#FFE66D',
        '#4ECDC4', '#45B7D1', '#54A0FF', '#B088E8'
    ],
    BUBBLE_COUNT: 8,             // 背景装饰泡泡数量（降低）
    CAT_EMOJI_COUNT: 0,          // 浮动猫咪 Emoji（手机端性能杀手，关闭）
    PAW_PRINT_COUNT: 6           // 静态猫爪印数量（降低）
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
var dpr = 1;                     // 设备像素比（限制在 MAX_DPR 以内）
var screenW = 0;                 // 屏幕宽度（CSS 像素）
var screenH = 0;                 // 屏幕高度（CSS 像素）

// FPS 计数器状态
var fpsFrames = 0;
var fpsLastTime = performance.now();
var fpsValue = 60;
var fpsEl = null;

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
 * 播放"喵呜喵呜"连续猫叫音效
 * 模拟"老吴老吴"的可爱节奏：连续两次高音调的"喵"音
 * 优先使用预加载的真实音频，失败时自动降级为 Web Audio 合成音效
 */
function playMeow() {
    if (isMuted) return;
    resumeAudioContext();
    if (!audioCtx) return;

    // 尝试播放真实音频
    if (audioLoaded) {
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

    // 降级：使用 Web Audio API 合成"喵呜喵呜"
    playSynthMeow();
}

/**
 * 播放预加载的 AudioBuffer（连续播放两次，模拟"喵呜喵呜"）
 */
function playBufferMeow(buffer) {
    // 第一次"喵"
    playBufferOnce(buffer, 0, 1.1 + Math.random() * 0.2);
    // 第二次"呜"（间隔 0.12 秒，音调略低）
    playBufferOnce(buffer, 0.12, 0.9 + Math.random() * 0.15);
}

/**
 * 单次播放 AudioBuffer 的辅助函数
 * @param {AudioBuffer} buffer - 音频缓冲
 * @param {number} delay - 延迟秒数
 * @param {number} rate - 播放速率（影响音调）
 */
function playBufferOnce(buffer, delay, rate) {
    var now = audioCtx.currentTime;
    var source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;

    var gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.35 + Math.random() * 0.3;

    var panner = audioCtx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 0.8;

    // 轻微回声
    var delayNode = audioCtx.createDelay();
    delayNode.delayTime.value = 0.06 + Math.random() * 0.05;
    var delayGain = audioCtx.createGain();
    delayGain.gain.value = 0.15;

    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(audioCtx.destination);
    panner.connect(delayNode);
    delayNode.connect(delayGain);
    delayGain.connect(audioCtx.destination);

    source.start(now + delay);
}

/**
 * 使用 Web Audio API 合成"喵呜喵呜"连续猫叫
 * 模拟幼猫/夹子音的高音调、快速连续节奏
 */
function playSynthMeow() {
    if (!audioCtx) return;
    var now = audioCtx.currentTime;

    // 连续两次"喵呜"，模拟"老吴老吴"节奏
    // 第一次"喵" - 更高更尖
    synthSingleMeow(now, 700, 950, 0.12, 0.3);
    // 第二次"呜" - 间隔 0.13 秒，音调略低
    synthSingleMeow(now + 0.13, 600, 820, 0.1, 0.22);
    // 第三次"喵" - 间隔 0.3 秒，重复节奏
    synthSingleMeow(now + 0.32, 720, 980, 0.11, 0.28);
    // 第四次"呜" - 收尾
    synthSingleMeow(now + 0.45, 580, 780, 0.09, 0.18);
}

/**
 * 合成单次"喵"音的辅助函数
 * @param {number} startTime - 起始时间
 * @param {number} baseFreq - 基础频率
 * @param {number} peakFreq - 峰值频率
 * @param {number} duration - 持续时间
 * @param {number} volume - 音量
 */
function synthSingleMeow(startTime, baseFreq, peakFreq, duration, volume) {
    var endFreq = baseFreq * 0.55;

    // 主振荡器（模拟猫叫频率滑动）
    var osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, startTime);
    osc.frequency.linearRampToValueAtTime(peakFreq, startTime + duration * 0.2);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    // 主增益包络（快速起音、自然衰减）
    var mainGain = audioCtx.createGain();
    mainGain.gain.setValueAtTime(0.001, startTime);
    mainGain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    // 第二谐波（增加音色丰富度，更高更萌）
    var osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2.5, startTime);
    osc2.frequency.linearRampToValueAtTime(peakFreq * 2, startTime + duration * 0.2);
    osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.8, startTime + duration);

    var harmGain = audioCtx.createGain();
    harmGain.gain.setValueAtTime(0.001, startTime);
    harmGain.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.015);
    harmGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    // 立体声偏移
    var panner = audioCtx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 0.6;

    // 连接路径
    osc.connect(mainGain);
    mainGain.connect(panner);
    osc2.connect(harmGain);
    harmGain.connect(panner);
    panner.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
    osc2.start(startTime);
    osc2.stop(startTime + duration + 0.05);
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
// 五、粒子绘制函数（柚子社华丽风格）
// ==========================================

/**
 * 绘制超大糖果粒子（无 shadowBlur，纯填充优化性能）
 */
function drawCandy(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size;

    // 糖果主体（椭圆）
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 高光
    ctx.beginPath();
    ctx.ellipse(-s * 0.2, -s * 0.15, s * 0.35, s * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();

    // 糖果条纹
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.5, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();

    // 左端包装纸（更大更华丽）
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.3);
    ctx.lineTo(-s * 1.6, -s * 0.7);
    ctx.lineTo(-s * 1.8, -s * 0.2);
    ctx.lineTo(-s * 1.5, 0);
    ctx.lineTo(-s * 1.8, s * 0.2);
    ctx.lineTo(-s * 1.6, s * 0.7);
    ctx.lineTo(-s, s * 0.3);
    ctx.closePath();
    ctx.fillStyle = p.color2 || p.color;
    ctx.fill();

    // 右端包装纸
    ctx.beginPath();
    ctx.moveTo(s, -s * 0.3);
    ctx.lineTo(s * 1.6, -s * 0.7);
    ctx.lineTo(s * 1.8, -s * 0.2);
    ctx.lineTo(s * 1.5, 0);
    ctx.lineTo(s * 1.8, s * 0.2);
    ctx.lineTo(s * 1.6, s * 0.7);
    ctx.lineTo(s, s * 0.3);
    ctx.closePath();
    ctx.fillStyle = p.color2 || p.color;
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制超大棒棒糖粒子（无 shadowBlur，纯填充优化性能）
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
    ctx.lineTo(0, r * 2.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 糖果圆形底
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 螺旋纹
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
        var angle = (i / 4) * Math.PI * 2;
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r * (0.25 + i * 0.2), angle, angle + Math.PI * 0.7);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 高光
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.25, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制爱心粒子（贝塞尔曲线，无 shadowBlur 优化性能）
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
    ctx.arc(-s * 0.3, -s * 0.4, s * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制五角星粒子（无 shadowBlur 优化性能）
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

    // 中心高光
    ctx.beginPath();
    ctx.arc(0, 0, outer * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制泡泡粒子（半透明圆圈 + 高光 + 彩虹反射）
 */
function drawBubble(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = p.alpha * 0.6;

    var r = p.size;

    // 泡泡主体
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha * 0.12;
    ctx.fill();

    // 泡泡边框（彩虹色）
    ctx.globalAlpha = p.alpha * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 高光点
    ctx.globalAlpha = p.alpha * 0.8;
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // 次要高光
    ctx.globalAlpha = p.alpha * 0.4;
    ctx.beginPath();
    ctx.arc(r * 0.2, r * 0.25, r * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制猫爪粒子（一个大垫 + 四个小趾垫，无 shadowBlur 优化性能）
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
 * 绘制闪光粒子（四角星芒，无 shadowBlur 优化性能）
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
    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制蝴蝶结粒子（无 shadowBlur 优化性能）
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
 * 绘制甜甜圈粒子（无 shadowBlur，纯填充优化性能）
 */
function drawDonut(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var r = p.size;

    // 甜甜圈主体
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2, true);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 糖霜
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, Math.PI * 2);
    ctx.arc(0, 0, r * 0.4, Math.PI * 2, Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    // 彩色糖粒
    var sprinkleColors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#B088E8', '#FF9FF3'];
    for (var i = 0; i < 6; i++) {
        var angle = Math.PI + (i / 6) * Math.PI + 0.15;
        var dist = r * 0.7;
        ctx.beginPath();
        ctx.arc(
            Math.cos(angle) * dist,
            Math.sin(angle) * dist,
            r * 0.09,
            0, Math.PI * 2
        );
        ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
        ctx.fill();
    }

    ctx.restore();
}

/**
 * 绘制马卡龙粒子（无 shadowBlur，纯填充优化性能）
 */
function drawMacaron(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size;

    // 上半片
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.15, s, s * 0.5, 0, Math.PI, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 下半片
    ctx.beginPath();
    ctx.ellipse(0, s * 0.15, s, s * 0.5, 0, 0, Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 夹心层
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.9, s * 0.15, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.color2 || '#FFF5E6';
    ctx.fill();

    // 裙边纹理（小锯齿）
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
        var angle = (i / 8) * Math.PI * 2;
        var rx = Math.cos(angle) * s * 0.92;
        var ry = Math.sin(angle) * s * 0.12;
        ctx.moveTo(rx, ry - 2);
        ctx.lineTo(rx, ry + 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
}

/**
 * 绘制冰淇淋粒子（无 shadowBlur，纯填充优化性能）
 */
function drawIceCream(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size;

    // 蛋筒（三角形）
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.1);
    ctx.lineTo(0, s * 1.5);
    ctx.lineTo(s * 0.5, s * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#DEB887';
    ctx.fill();

    // 蛋筒网格纹
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, s * 0.4);
    ctx.lineTo(s * 0.3, s * 0.4);
    ctx.moveTo(-s * 0.15, s * 0.8);
    ctx.lineTo(s * 0.15, s * 0.8);
    ctx.strokeStyle = 'rgba(139,90,43,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 冰淇淋球
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 高光
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.25, s * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();

    // 顶部樱桃
    ctx.beginPath();
    ctx.arc(0, -s * 0.6, s * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#FF4757';
    ctx.fill();

    // 樱桃梗
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.75);
    ctx.quadraticCurveTo(s * 0.1, -s * 0.95, s * 0.05, -s * 0.85);
    ctx.strokeStyle = '#2d5016';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
}

/**
 * 绘制彩虹拖尾粒子（弧形彩虹条，无 shadowBlur 优化性能）
 */
function drawRainbowTrail(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size;
    var colors = CONFIG.RAINBOW;

    for (var i = 0; i < colors.length; i++) {
        ctx.beginPath();
        var radius = s * (0.5 + i * 0.12);
        ctx.arc(0, 0, radius, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * 绘制可爱猫脸粒子（哈基米！）
 * 圆形脸 + 三角耳朵 + 眼睛 + 嘴巴 + 觸须
 */
function drawCatFace(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size;
    var faceColor = p.color;
    var darkColor = p.color2;

    // 脸（圆形）
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fillStyle = faceColor;
    ctx.fill();

    // 左耳（三角）
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, -s * 0.55);
    ctx.lineTo(-s * 0.35, -s * 1.15);
    ctx.lineTo(-s * 0.05, -s * 0.6);
    ctx.closePath();
    ctx.fillStyle = faceColor;
    ctx.fill();

    // 右耳
    ctx.beginPath();
    ctx.moveTo(s * 0.75, -s * 0.55);
    ctx.lineTo(s * 0.35, -s * 1.15);
    ctx.lineTo(s * 0.05, -s * 0.6);
    ctx.closePath();
    ctx.fill();

    // 内耳（粉色）
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.6);
    ctx.lineTo(-s * 0.38, -s * 0.98);
    ctx.lineTo(-s * 0.15, -s * 0.62);
    ctx.closePath();
    ctx.fillStyle = '#FFB3D1';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(s * 0.6, -s * 0.6);
    ctx.lineTo(s * 0.38, -s * 0.98);
    ctx.lineTo(s * 0.15, -s * 0.62);
    ctx.closePath();
    ctx.fillStyle = '#FFB3D1';
    ctx.fill();

    // 眼睛（两个小黑圆 + 高光）
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-s * 0.32, -s * 0.1, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.32, -s * 0.1, s * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛高光
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s * 0.28, -s * 0.15, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.36, -s * 0.15, s * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // 嘴巴（w 形）
    ctx.beginPath();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.moveTo(-s * 0.2, s * 0.2);
    ctx.quadraticCurveTo(-s * 0.1, s * 0.35, 0, s * 0.2);
    ctx.quadraticCurveTo(s * 0.1, s * 0.35, s * 0.2, s * 0.2);
    ctx.stroke();

    // 腮红（两个粉色圆）
    ctx.globalAlpha = p.alpha * 0.4;
    ctx.fillStyle = '#FF6B9D';
    ctx.beginPath();
    ctx.arc(-s * 0.55, s * 0.15, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.55, s * 0.15, s * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * 绘制小鱼干粒子（猫咪最爱）
 */
function drawFish(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    var s = p.size;
    var fishColor = p.color;

    // 鱼身（椭圆）
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = fishColor;
    ctx.fill();

    // 鱼尾（三角）
    ctx.beginPath();
    ctx.moveTo(s * 0.7, 0);
    ctx.lineTo(s * 1.4, -s * 0.5);
    ctx.lineTo(s * 1.4, s * 0.5);
    ctx.closePath();
    ctx.fill();

    // 鱼眼
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s * 0.4, -s * 0.1, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-s * 0.38, -s * 0.1, s * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // 鱼鳍
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, s * 0.4);
    ctx.quadraticCurveTo(0, s * 0.8, s * 0.3, s * 0.45);
    ctx.strokeStyle = fishColor;
    ctx.lineWidth = 2;
    ctx.stroke();

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
    macaron: drawMacaron,
    iceCream: drawIceCream,
    rainbowTrail: drawRainbowTrail,
    catFace: drawCatFace,
    fish: drawFish
};

var PARTICLE_TYPES = Object.keys(PARTICLE_DRAW);

// 分层配置：大幅减少每层粒子数，移除高开销的 catFace/rainbowTrail
var LAYER_CONFIG = {
    bottom: { types: ['candy', 'lollipop', 'macaron', 'catFace'], sizeMin: 'BIG_MIN_SIZE', sizeMax: 'BIG_MAX_SIZE', speedRange: [3, 8], count: 2 },
    middle: { types: ['heart', 'star', 'catPaw', 'fish'], sizeMin: 'MID_MIN_SIZE', sizeMax: 'MID_MAX_SIZE', speedRange: [2, 6], count: 3 },
    top:    { types: ['sparkle', 'fish'], sizeMin: 'TOP_MIN_SIZE', sizeMax: 'TOP_MAX_SIZE', speedRange: [1, 4], count: 3 }
};

// ==========================================
// 六、粒子系统（生成、更新、回收）
// ==========================================

/**
 * 在指定位置生成多层超大粒子爆发
 * 底层：巨大糖果（屏幕 1/4 尺寸级别）
 * 中层：星星、爱心、蝴蝶结等
 * 顶层：闪光、彩虹拖尾
 * @param {number} x - 点击位置 X 坐标
 * @param {number} y - 点击位置 Y 坐标
 */
function spawnParticles(x, y) {
    var layerKeys = ['bottom', 'middle', 'top'];

    for (var li = 0; li < layerKeys.length; li++) {
        var layer = LAYER_CONFIG[layerKeys[li]];
        var layerCount = layer.count + randInt(0, 1);

        for (var i = 0; i < layerCount; i++) {
            // 超过上限时移除最旧粒子
            while (particles.length >= CONFIG.MAX_PARTICLES) {
                particles.shift();
            }

            var type = layer.types[Math.floor(Math.random() * layer.types.length)];
            var angle = Math.random() * Math.PI * 2;
            var speed = randRange(layer.speedRange[0], layer.speedRange[1]);
            var sizeMin = CONFIG[layer.sizeMin];
            var sizeMax = CONFIG[layer.sizeMax];

            var particle = {
                type: type,
                x: x + randRange(-10, 10),
                y: y + randRange(-10, 10),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: randRange(sizeMin, sizeMax),
                alpha: 1,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: randRange(-0.06, 0.06),
                life: 1,
                decay: randRange(0.012, 0.028),
                color: randColor(),
                color2: randColor(),
                gravity: (type === 'bubble') ? -0.03 : 0.04,
                friction: 0.988,
                scalePhase: Math.random() * Math.PI * 2,
                trail: (type === 'rainbowTrail'),
                layer: layerKeys[li]
            };

            particles.push(particle);
        }
    }

    // 额外生成一圈环绕的小闪光（数量大幅减少）
    var sparkleCount = randInt(2, 4);
    for (var s = 0; s < sparkleCount; s++) {
        if (particles.length >= CONFIG.MAX_PARTICLES) break;

        var sAngle = (s / sparkleCount) * Math.PI * 2;
        var sSpeed = randRange(6, 14);

        particles.push({
            type: 'sparkle',
            x: x,
            y: y,
            vx: Math.cos(sAngle) * sSpeed,
            vy: Math.sin(sAngle) * sSpeed,
            size: randRange(3, 8),
            alpha: 1,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: randRange(-0.1, 0.1),
            life: 1,
            decay: randRange(0.03, 0.05),
            color: randRainbow(),
            color2: '#fff',
            gravity: 0.02,
            friction: 0.975,
            scalePhase: 0,
            trail: false,
            layer: 'top'
        });
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

        // 缩放脉动
        p.scalePhase += 0.1;

        // 拖尾粒子：手机端关闭拖尾增殖，大幅减少额外粒子
        // （原逻辑每帧 30% 概率生成子粒子，手机端完全跳过）

        // 移除已消亡的粒子
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

/**
 * 绘制所有活跃粒子（按数组顺序绘制，避免每帧分配排序数组）
 * 粒子生成时已按 bottom→middle→top 顺序添加，天然具有层级
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
        'rgba(255,107,157,0.35)',
        'rgba(127,219,202,0.35)',
        'rgba(255,230,109,0.35)',
        'rgba(176,136,232,0.35)',
        'rgba(255,159,243,0.35)',
        'rgba(84,160,255,0.35)',
        'rgba(255,99,72,0.3)'
    ];

    for (var i = 0; i < CONFIG.BUBBLE_COUNT; i++) {
        var bubble = document.createElement('div');
        bubble.className = 'bubble';

        var size = randRange(15, 70);
        var left = randRange(0, 100);
        var duration = randRange(8, 22);
        var delay = randRange(0, 15);
        var color = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];

        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';
        bubble.style.left = left + '%';
        bubble.style.bottom = '-' + size + 'px';
        bubble.style.background = 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), ' + color + ')';
        bubble.style.animationDuration = duration + 's';
        bubble.style.animationDelay = delay + 's';

        container.appendChild(bubble);
    }
}

/**
 * 生成背景浮动猫咪 Emoji（哈基米元素）
 * 纯 DOM + CSS 动画，GPU 加速，不影响性能
 */
function createCatEmojis() {
    var container = document.getElementById('bg-cat-emojis');
    if (!container) return;

    var catEmojis = ['🐱', '😺', '😸', '🐾', '🐟', '😻', '🐈', '🐈‍⬛', '😽', '🙀', '😹', '🐭'];

    for (var i = 0; i < CONFIG.CAT_EMOJI_COUNT; i++) {
        var el = document.createElement('div');
        el.className = 'cat-emoji';

        var emoji = catEmojis[Math.floor(Math.random() * catEmojis.length)];
        var size = randRange(6, 18);
        var left = randRange(0, 100);
        var duration = randRange(12, 30);
        var delay = randRange(0, 20);

        el.textContent = emoji;
        el.style.left = left + '%';
        el.style.bottom = '-4rem';
        el.style.fontSize = size + 'rem';
        el.style.animationDuration = duration + 's';
        el.style.animationDelay = delay + 's';
        el.style.opacity = '1';

        container.appendChild(el);
    }
}

/**
 * 生成静态猫爪印装饰（哈基米足迹散布）
 * 半透明猫爪印散布在背景中，轻微呼吸动画
 */
function createPawPrints() {
    var container = document.getElementById('bg-paw-prints');
    if (!container) return;

    var pawEmojis = ['🐾'];

    for (var i = 0; i < CONFIG.PAW_PRINT_COUNT; i++) {
        var el = document.createElement('div');
        el.className = 'paw-print';

        var size = randRange(6, 14);
        var left = randRange(2, 95);
        var top = randRange(2, 95);
        var rotation = randRange(-45, 45);
        var delay = randRange(0, 6);

        el.textContent = pawEmojis[0];
        el.style.left = left + '%';
        el.style.top = top + '%';
        el.style.fontSize = size + 'rem';
        el.style.transform = 'rotate(' + rotation + 'deg)';
        el.style.animationDelay = delay + 's';

        container.appendChild(el);
    }
}

// ==========================================
// 八、全屏视觉反馈特效
// ==========================================

// 背景色块爆发可用的 CSS class 列表
var BG_BURST_CLASSES = [
    'burst-pink',
    'burst-mint',
    'burst-yellow',
    'burst-purple',
    'burst-rainbow',
    'burst-candy'
];
var lastBurstClass = '';

/**
 * 触发背景大色块爆发效果
 * 随机选择一种糖果色渐变，通过 CSS transform + opacity 动画实现（GPU 加速）
 */
function triggerBgBurst() {
    var burst = document.getElementById('bg-burst');
    if (!burst) return;

    // 随机选一个与上次不同的色块方案
    var cls;
    do {
        cls = BG_BURST_CLASSES[Math.floor(Math.random() * BG_BURST_CLASSES.length)];
    } while (cls === lastBurstClass && BG_BURST_CLASSES.length > 1);
    lastBurstClass = cls;

    // 清除所有旧色块 class 和 active 状态
    for (var i = 0; i < BG_BURST_CLASSES.length; i++) {
        burst.classList.remove(BG_BURST_CLASSES[i]);
    }
    burst.classList.remove('active');

    // 强制回流后触发新动画
    void burst.offsetWidth;

    burst.classList.add(cls);
    burst.classList.add('active');

    // 动画结束后自动重置，保证下次点击能重新触发
    setTimeout(function() {
        burst.classList.remove('active');
        burst.classList.remove(cls);
    }, 600);
}

/**
 * 触发全屏闪白效果
 */
function triggerFlash() {
    var flash = document.getElementById('flash-overlay');
    if (!flash) return;
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
    // 动画结束后移除 class
    setTimeout(function() {
        flash.classList.remove('active');
    }, 450);
}

/**
 * 触发彩虹冲击波效果（从点击位置扩散，纯 transform 动画）
 */
function triggerShockwave(x, y) {
    var sw = document.getElementById('shockwave');
    if (!sw) return;
    // 通过 CSS 变量定位，避免触发 layout 重排
    sw.style.setProperty('--sw-x', x + 'px');
    sw.style.setProperty('--sw-y', y + 'px');
    sw.classList.remove('active');
    void sw.offsetWidth;
    sw.classList.add('active');
    setTimeout(function() {
        sw.classList.remove('active');
    }, 650);
}

/**
 * 触发屏幕震动效果
 */
function triggerShake() {
    var body = document.body;
    body.classList.remove('shake');
    void body.offsetWidth;
    body.classList.add('shake');
    setTimeout(function() {
        body.classList.remove('shake');
    }, 350);
}

// ==========================================
// 九、Canvas 初始化与尺寸管理
// ==========================================

/**
 * 初始化 Canvas 或在其尺寸变化时重新计算
 * 限制 devicePixelRatio 在 MAX_DPR 以内，避免 4K 屏渲染海量像素
 */
function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_DPR);
    screenW = window.innerWidth;
    screenH = window.innerHeight;
    canvas.width = screenW * dpr;
    canvas.height = screenH * dpr;
    canvas.style.width = screenW + 'px';
    canvas.style.height = screenH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ==========================================
// 十、UI 交互控制
// ==========================================

/**
 * 更新点击计数显示
 */
function updateCounter() {
    clickCount++;
    var counterNum = document.getElementById('counter-num');
    if (counterNum) {
        counterNum.textContent = clickCount;
        counterNum.classList.remove('pop');
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
 * 触发内容区域的轻微弹跳反馈（已减弱，减少 DOM 操作）
 */
function triggerBounce() {
    // 不再触发 DOM 弹跳动画，避免强制回流
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
// 十一、事件绑定
// ==========================================

function bindEvents() {
    // 使用 pointerdown 统一处理鼠标和触摸事件
    document.addEventListener('pointerdown', function(e) {
        if (e.button !== 0) return;
        if (e.isPrimary === false) return;

        pointerStartX = e.clientX;
        pointerStartY = e.clientY;
    }, { passive: true });

    document.addEventListener('pointerup', function(e) {
        if (e.button !== 0) return;
        if (e.isPrimary === false) return;

        // 超过阈值视为拖动
        var dx = e.clientX - pointerStartX;
        var dy = e.clientY - pointerStartY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) return;

        // 检查 data-no-effect 区域
        if (hasNoEffect(e.target)) return;

        // 首次交互时初始化音频
        if (!audioCtx) {
            initAudio();
        }

        var x = e.clientX;
        var y = e.clientY;

        // 生成多层超大粒子特效
        spawnParticles(x, y);

        // 播放"喵呜喵呜"音效
        playMeow();

        // 更新计数
        updateCounter();

        // 全屏视觉反馈四连：背景色块 + 闪白 + 冲击波 + 屏幕震动
        triggerBgBurst();
        triggerFlash();
        triggerShockwave(x, y);
        triggerShake();

        // 内容区域弹跳
        triggerBounce();
    }, { passive: true });

    // 阻止右键菜单
    document.addEventListener('contextmenu', function(e) {
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
// 十二、主动画循环
// ==========================================

/**
 * requestAnimationFrame 驱动的主循环
 * 每帧清除画布、更新并绘制所有粒子，同时计算 FPS
 */
function animate() {
    ctx.clearRect(0, 0, screenW, screenH);
    updateParticles();
    drawParticles();

    // FPS 计数
    fpsFrames++;
    var now = performance.now();
    var elapsed = now - fpsLastTime;
    if (elapsed >= 1000) {
        fpsValue = Math.round(fpsFrames * 1000 / elapsed);
        fpsFrames = 0;
        fpsLastTime = now;
        if (fpsEl) {
            fpsEl.textContent = fpsValue + ' FPS';
        }
    }

    requestAnimationFrame(animate);
}

// ==========================================
// 十三、初始化入口
// ==========================================

/**
 * 页面加载完成后初始化所有系统
 */
function init() {
    canvas = document.getElementById('canvas');
    if (!canvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');

    // 获取 FPS 计数器元素
    fpsEl = document.getElementById('fps-counter');

    // 初始化 Canvas 尺寸（含 DPR 限制）
    resizeCanvas();

    // 生成背景装饰泡泡
    createBackgroundBubbles();

    // 生成浮动猫咪 Emoji（哈基米！）
    createCatEmojis();

    // 生成静态猫爪印装饰
    createPawPrints();

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
