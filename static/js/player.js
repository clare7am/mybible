const audio = document.getElementById('audio-player');
const progress = document.getElementById('progress');
const playPauseBtn = document.getElementById('play-pause');

const iconPlay = document.getElementById('icon-play-big');
const iconPause = document.getElementById('icon-pause-big');

/* =========================
   书卷 → 音频文件名映射
   ========================= */
const BOOK_ABBR = {
    1: 'Gen', 2: 'Ex', 3: 'Lev', 4: 'Num', 5: 'Dt',
    6: 'Jos', 7: 'Jdg', 8: 'Ru', 9: '1S', 10: '2S',
    11: '1K', 12: '2K', 13: '1Chr', 14: '2Chr',
    15: 'Ezra', 16: 'Ne', 17: 'Tb', 18: 'Jdt', 19: 'Es',
    20: '1Mac', 21: '2Mac', 22: 'Job', 23: 'Ps', 24: 'Pro',
    25: 'Ecl', 26: 'Song', 27: 'Wis', 28: 'Sir', 29: 'Is',
    30: 'Jer', 31: 'Lm', 32: 'Bar', 33: 'Ezk', 34: 'Dn',
    35: 'Hos', 36: 'Jl', 37: 'Am', 38: 'Ob', 39: 'Jon',
    40: 'Mic', 41: 'Nh', 42: 'Hb', 43: 'Zep', 44: 'Hg',
    45: 'Zec', 46: 'Mal', 47: 'Mt', 48: 'Mk', 49: 'Lk',
    50: 'Jn', 51: 'Acts', 52: 'Rom', 53: '1Cor', 54: '2Cor',
    55: 'Gal', 56: 'Eph', 57: 'Phil', 58: 'Col', 59: '1Thes',
    60: '2Thes', 61: '1Tim', 62: '2Tim', 63: 'Tit', 64: 'Phlm',
    65: 'Heb', 66: 'Jas', 67: '1P', 68: '2P', 69: '1Jn',
    70: '2Jn', 71: '3Jn', 72: 'Jd', 73: 'Rev'
};

function getAudioUrl() {
    const prefix = BOOK_ABBR[Bible.book];
    if (!prefix || !Bible.chapter) return null;

    const bookNum = String(Bible.book).padStart(2, '0');
    const chapterStr = String(Bible.chapter).padStart(3, '0');

    return `https://c7-audio.oss-cn-beijing.aliyuncs.com/${bookNum}_${prefix}_${chapterStr}_en.mp3`;
}

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

function enablePlayer() {
    playPauseBtn.disabled = false;
    progress.disabled = false;
    playPauseBtn.classList.remove('disabled');
}

function disablePlayer() {
    playPauseBtn.disabled = true;
    progress.disabled = true;
    playPauseBtn.classList.add('disabled');

    audio.pause();
    audio.removeAttribute('src');
    audio.load();
}

function updateAudio() {
    const url = getAudioUrl();

    if (audio.src === url) return;

    progress.value = 0;
    clearWordHighlight();

    audio.pause();
    audio.currentTime = 0;

    audio.removeAttribute('src');
    audio.load();

    audio._pendingUrl = url;

    if (!url) {
        disablePlayer();
        return;
    }

    enablePlayer();

    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';

    if (shouldAutoPlay) {
        audio.src = url;
        audio.load();
        audio.play().catch(() => {
            syncPlayButtonIcon();
        });
        shouldAutoPlay = false;
    }
}

let shouldAutoPlay = false;

function togglePlay() {
    if (playPauseBtn.disabled) return;

    if (!audio.src && audio._pendingUrl) {
        audio.src = audio._pendingUrl;
        audio.load();
    }

    shouldAutoPlay = false;
    audio.paused ? audio.play() : audio.pause();
}

progress.addEventListener('input', () => {
    if (!audio.duration) return;
    audio.currentTime = (progress.value / 100) * audio.duration;
});

audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        progress.value = (audio.currentTime / audio.duration) * 100;
    }
    highlightWordAt(Math.floor(audio.currentTime * 1000));
});

audio.addEventListener('play', syncPlayButtonIcon);
audio.addEventListener('pause', syncPlayButtonIcon);
audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    progress.value = 0;
    syncPlayButtonIcon();
    shouldAutoPlay = true;
    nextChapter();
});


/* ========= 空格键控制播放 / 暂停 ========= */
document.addEventListener('keydown', (e) => {
    // 只响应空格
    if (e.code !== 'Space' && e.key !== ' ') return;

    // 忽略输入框、文本域、contenteditable
    const tag = e.target.tagName;
    const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        e.target.isContentEditable;

    if (isEditable) return;

    // 忽略组合键（防止和 Alt+Space / Ctrl+Space 冲突）
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    e.preventDefault();      // 防止页面滚动
    togglePlay();            // 复用已有播放逻辑
});

/* ========= 左右箭头快进 / 快退 ========= */
const SKIP_SECONDS = 15;

document.addEventListener('keydown', (e) => {
    // 忽略输入框、文本域、contenteditable
    const tag = e.target.tagName;
    const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        e.target.isContentEditable;

    if (isEditable) return;

    // 忽略组合键
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        audio.currentTime = Math.max(0, audio.currentTime - SKIP_SECONDS);
    }

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + SKIP_SECONDS);
    }
});