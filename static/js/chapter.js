/**
 * 章节切换（由 selectChapter 或顶栏箭头触发）
 * @param {number} chapter
 * @param {function} [onReady] - 经文渲染完成后的回调
 */
function onChapterChange(chapter, onReady) {
    if (!chapter) return;

    const wasPlaying = !audio.paused && !audio.ended;

    Bible.chapter = chapter;

    // 同步 select
    const sel = document.getElementById("chapter");
    if (sel) sel.value = chapter;

    // 更新顶部标题
    const book = window._allBooks?.find(b => b.id === Bible.book);
    if (book) {
        const span = document.getElementById("book-btn-text");
        if (span) span.textContent = `${book.name_cn} ${chapter}`;
    }

    // 加载经文 + 音频（透传 onReady）
    loadVerses(onReady);
    updateAudio();

    // ✅ 只有当 shouldAutoPlay=true 时才自动播放
    if (shouldAutoPlay && audio._pendingUrl) {
        audio.src = audio._pendingUrl;
        audio.load();
        audio.play().catch(() => syncPlayButtonIcon());
    }
}

/**
 * 获取当前书卷的章节数组
 */
function getCurrentChapters() {
    return window._currentChapters || [];
}

/**
 * 上一章
 */
async function prevChapter() {
    // ✅ 顶部按钮触发：不自动播放
    shouldAutoPlay = false;

    const chapters = getCurrentChapters();
    const bookIndex = window._allBooks.findIndex(b => b.id === Bible.book);
    const currentCh = Number(Bible.chapter) || 1;

    // 章节数据还没加载
    if (chapters.length === 0) {
        console.warn("prevChapter: 章节未加载，重新加载当前书卷");
        await loadChaptersForCurrentBook(currentCh);
        return;
    }

    // 找到当前章在数组中的位置
    const chIndex = chapters.findIndex(c => Number(c.chapter) === currentCh);

    if (chIndex > 0) {
        // 同卷内上一章
        const target = chapters[chIndex - 1].chapter;
        Bible.chapter = target;
        onChapterChange(target);
        return;
    }

    // 跨书卷：上一卷最后一章
    if (bookIndex > 0) {
        const prevBook = window._allBooks[bookIndex - 1];
        Bible.book = prevBook.id;
        try {
            const chs = await loadChaptersForBook(prevBook.id, null);
            const lastCh = chs[chs.length - 1].chapter;
            Bible.chapter = lastCh;
            onChapterChange(lastCh);
        } catch (e) {
            console.error("跨卷 prev 失败:", e);
        }
    }
    // else: 已在第一卷第一章，什么都不做
}

/**
 * 下一章
 */
async function nextChapter() {
    // ✅ 顶部按钮触发：不自动播放
    shouldAutoPlay = false;

    const chapters = getCurrentChapters();
    const bookIndex = window._allBooks.findIndex(b => b.id === Bible.book);
    const currentCh = Number(Bible.chapter) || 1;

    if (chapters.length === 0) {
        console.warn("nextChapter: 章节未加载，重新加载当前书卷");
        await loadChaptersForCurrentBook(currentCh);
        return;
    }

    const chIndex = chapters.findIndex(c => Number(c.chapter) === currentCh);

    if (chIndex >= 0 && chIndex < chapters.length - 1) {
        // 同卷内下一章
        const target = chapters[chIndex + 1].chapter;
        Bible.chapter = target;
        onChapterChange(target);
        return;
    }

    // 跨书卷：下一卷第一章
    if (bookIndex >= 0 && bookIndex < window._allBooks.length - 1) {
        const nextBook = window._allBooks[bookIndex + 1];
        Bible.book = nextBook.id;
        try {
            const chs = await loadChaptersForBook(nextBook.id, null);
            const firstCh = chs[0].chapter;
            Bible.chapter = firstCh;
            onChapterChange(firstCh);
        } catch (e) {
            console.error("跨卷 next 失败:", e);
        }
    }
    // else: 已在最后一卷末章，什么都不做
}

/**
 * 加载当前书卷章节（不带预设目标 → 保留当前章或默认1）
 */
async function loadChaptersForCurrentBook(fallbackChapter) {
    const target = fallbackChapter || Bible.chapter || 1;
    return loadChaptersForBook(Bible.book, target);
}

/**
 * 加载指定书卷的章节 JSON
 * @param {number} bookId
 * @param {number|null} targetChapter - 如果 null，则保留 Bible.chapter
 * @returns {Promise<Array>}
 */
async function loadChaptersForBook(bookId, targetChapter) {
    const sel = document.getElementById("chapter");
    const abbr = getAbbr(bookId);
    const bookStr = String(bookId).padStart(2, "0");
    const url = `./static/chapters/${bookStr}_${abbr}.json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("章节 JSON 不存在: " + url);
    const chapters = await res.json();

    // ✅ 存入内存真理源
    window._currentChapters = chapters;

    // 同步 select
    if (sel) {
        sel.innerHTML = '';
        chapters.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.chapter;
            opt.innerText = item.chapter_title?.trim() ? item.chapter_title : item.chapter;
            sel.appendChild(opt);
        });
        sel.disabled = false;
    }

    // 确定目标章节
    const requested = targetChapter != null ? targetChapter : (Bible.chapter || 1);
    const exists = chapters.some(c => Number(c.chapter) === Number(requested));
    const target = exists ? requested : chapters[0].chapter;

    Bible.chapter = target;
    if (sel) sel.value = target;

    // 更新顶部
    const book = window._allBooks.find(b => b.id === Number(bookId));
    if (book) {
        const span = document.getElementById("book-btn-text");
        if (span) span.textContent = `${book.name_cn} ${target}`;
    }

    // 加载经文 + 音频
    loadVerses();
    updateAudio();

    return chapters;
}
