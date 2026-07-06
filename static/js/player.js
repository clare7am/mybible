const audio = document.getElementById('audio-player');
const progress = document.getElementById('progress');
const playPauseBtn = document.getElementById('play-pause-btn');

const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');

/* =========================
   书卷 → 音频文件名映射
   ========================= */
const BOOK_ABBR = {
    1: 'Gen',
    2: 'Ex',
    3: 'Lev',
    4: 'Num',
    5: 'Dt',
    6: 'Jos',
    7: 'Jdg',
    8: 'Ru',
    9: '1S',
    10: '2S',
    11: '1K',
    12: '2K',
    13: '1Chr',
    14: '2Chr',
    15: 'Ezra',
    16: 'Ne',
    17: 'Tb',
    18: 'Jdt',
    19: 'Es',
    20: '1Mac',
    21: '2Mac',
    22: 'Job',
    23: 'Ps',
    24: 'Pro',
    25: 'Ecl',
    26: 'Song',
    27: 'Wis',
    28: 'Sir',
    29: 'Is',
    30: 'Jer',
    31: 'Lm',
    32: 'Bar',
    33: 'Ezk',
    34: 'Dn',
    35: 'Hos',
    36: 'Jl',
    37: 'Am',
    38: 'Ob',
    39: 'Jon',
    40: 'Mic',
    41: 'Nh',
    42: 'Hb',
    43: 'Zep',
    44: 'Hg',
    45: 'Zec',
    46: 'Mal',
    47: 'Mt',
    48: 'Mk',
    49: 'Lk',
    50: 'Jn',
    51: 'Acts',
    52: 'Rom',
    53: '1Cor',
    54: '2Cor',
    55: 'Gal',
    56: 'Eph',
    57: 'Phil',
    58: 'Col',
    59: '1Thes',
    60: '2Thes',
    61: '1Tim',
    62: '2Tim',
    63: 'Tit',
    64: 'Phlm',
    65: 'Heb',
    66: 'Jas',
    67: '1P',
    68: '2P',
    69: '1Jn',
    70: '2Jn',
    71: '3Jn',
    72: 'Jd',
    73: 'Rev'
};

/* =========================
   生成当前章节音频 URL
   ========================= */
function getAudioUrl() {
    const prefix = BOOK_ABBR[Bible.book];
    if (!prefix || !Bible.chapter) return null;

    const bookNum = String(Bible.book).padStart(2, '0');
    const chapterStr = String(Bible.chapter).padStart(3, '0');

    return `https://c7-audio.oss-cn-beijing.aliyuncs.com/${bookNum}_${prefix}_${chapterStr}_en.mp3`;
}

/* =========================
   同步播放按钮 SVG
   ========================= */
function syncPlayButtonIcon() {
    if (!iconPlay || !iconPause) return;

    if (audio.paused || audio.ended) {
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
    } else {
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
    }
}

/* =========================
   启用播放器
   ========================= */
function enablePlayer() {
    playPauseBtn.disabled = false;
    progress.disabled = false;
    playPauseBtn.classList.remove('disabled');
}

/* =========================
   禁用播放器（无音频）
   ========================= */
function disablePlayer() {
    playPauseBtn.disabled = true;
    progress.disabled = true;
    playPauseBtn.classList.add('disabled');

    audio.pause();
    audio.removeAttribute('src');
    audio.load();
}

/* =========================
   章节切换时统一入口
   ✅ 不加载音频，只保存 URL
   ========================= */
function updateAudio() {
    const url = getAudioUrl();

    // 同一章节不重复处理
    if (audio.src === url) return;

    // 清理 UI
    progress.value = 0;
    clearWordHighlight();

    audio.pause();
    audio.currentTime = 0;

    // ✅ 关键：移除 src，不触发下载
    audio.removeAttribute('src');
    audio.load();

    // ✅ 暂存 URL，等用户点击播放再用
    audio._pendingUrl = url;

    if (!url) {
        disablePlayer();
        return;
    }

    enablePlayer();

    // ✅ 只重置图标，不加载音频
    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';
}

/* =========================
   播放 / 暂停
   ✅ 第一次播放才真正加载音频
   ========================= */
function togglePlay() {
    if (playPauseBtn.disabled) return;

    // ✅ 按需加载
    if (!audio.src && audio._pendingUrl) {
        audio.src = audio._pendingUrl;
        audio.load();
    }

    audio.paused ? audio.play() : audio.pause();
}

/* =========================
   进度条拖动
   ========================= */
progress.addEventListener('input', () => {
    if (!audio.duration) return;
    audio.currentTime = (progress.value / 100) * audio.duration;
});

/* =========================
   播放进度 + 高亮
   ========================= */
audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        progress.value = (audio.currentTime / audio.duration) * 100;
    }
    highlightWordAt(Math.floor(audio.currentTime * 1000));
});

/* =========================
   播放状态 → 按钮 SVG
   ========================= */
audio.addEventListener('play', syncPlayButtonIcon);
audio.addEventListener('pause', syncPlayButtonIcon);
audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    progress.value = 0;
    syncPlayButtonIcon();
});