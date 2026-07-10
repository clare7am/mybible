/**
 * 章节切换时：
 * - 更新全局状态
 * - 加载经文（JSON）
 * - 更新音频
 */
function onChapterChange(sel) {
    const chapter = sel.value;
    if (!chapter) return;

    const bookSelect = document.getElementById("book");
    const wasPlaying = !audio.paused && !audio.ended; //
    const info = document.getElementById("info");

    // 更新全局状态
    Bible.book = bookSelect.value;
    Bible.chapter = chapter;

    // 更新提示文字
    if (info) {
        const bookName = bookSelect.options[bookSelect.selectedIndex].text;
        info.innerText = `当前：${bookName} 第 ${chapter} 章`;
    }

    // 加载经文（JSON）
    loadVerses();

    // 更新音频
    updateAudio();

    // 如果之前正在播放，就继续播
    if (wasPlaying && audio._pendingUrl) {
        audio.src = audio._pendingUrl;
        audio.load();
        audio.play().catch(() => {
            // iOS 首次播放限制兜底
            syncPlayButtonIcon();
        });
    }
}


/**
 * 获取当前书卷的总章节数
 */
function getMaxChapter() {
    const chapterSelect = document.getElementById("chapter");
    if (!chapterSelect || chapterSelect.options.length === 0) return 0;
    return chapterSelect.options.length;
}

/**
 * 切换到上一章
 */
function prevChapter() {

    shouldAutoPlay = true;

    const bookSelect = document.getElementById("book");
    const chapterSelect = document.getElementById("chapter");

    let bookIndex = bookSelect.selectedIndex;
    let chapterIndex = chapterSelect.selectedIndex;

    // 当前不是第一章 → 上一章
    if (chapterIndex > 0) {
        chapterSelect.selectedIndex = chapterIndex - 1;
        onChapterChange(chapterSelect);
        return;
    }

    // 已经是第一章 → 切到上一卷书的最后一章
    if (bookIndex > 0) {
        bookSelect.selectedIndex = bookIndex - 1;
        onBookChange(bookSelect);

        // onBookChange 是异步的，等章节加载完再选最后一章
        setTimeout(() => {
            const lastIdx = chapterSelect.options.length - 1;
            chapterSelect.selectedIndex = lastIdx;
            onChapterChange(chapterSelect);
        }, 100);
    }
}

/**
 * 切换到下一章
 */
function nextChapter() {
    
    shouldAutoPlay = true;

    const bookSelect = document.getElementById("book");
    const chapterSelect = document.getElementById("chapter");

    let bookIndex = bookSelect.selectedIndex;
    let chapterIndex = chapterSelect.selectedIndex;
    const maxChapter = getMaxChapter();

    // 当前不是最后一章 → 下一章
    if (chapterIndex < maxChapter - 1) {
        chapterSelect.selectedIndex = chapterIndex + 1;
        onChapterChange(chapterSelect);
        return;
    }

    // 已经是最后一章 → 切到下一卷书的第一章
    if (bookIndex < bookSelect.options.length - 1) {
        bookSelect.selectedIndex = bookIndex + 1;
        onBookChange(bookSelect);

        setTimeout(() => {
            chapterSelect.selectedIndex = 0;
            onChapterChange(chapterSelect);
        }, 100);
    }
}