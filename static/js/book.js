/* ========= 书卷 + 章节 并排侧拉面板 ========= */

window._allBooks = [];
window._bookCategories = null;
window._currentTestament = "old";

// ✅ 当前书卷的章节数组（内存真理源，不依赖 DOM select）
window._currentChapters = [];

/* ---------- 初始化 ---------- */
async function initBookSelector() {
    try {
        const [booksResp, catResp] = await Promise.all([
            fetch("./static/books.json"),
            fetch("./static/book-categories.json")
        ]);

        window._allBooks = await booksResp.json();
        window._bookCategories = await catResp.json();

        // 默认：创世纪 第1章
        const first = window._allBooks[0];
        Bible.book = first.id;
        Bible.chapter = 1;

        bindUI();
        updateTopTitle(first, 1);

        // 加载章节 + 经文 + 音频
        await loadChaptersForBook(first.id, 1);
    } catch (err) {
        console.error("书卷初始化失败:", err);
        const span = document.getElementById("book-btn-text");
        if (span) span.textContent = "加载失败";
    }
}

/* ---------- 绑定 DOM 事件 ---------- */
function bindUI() {
    const titleBtn = document.getElementById("book-btn");
    if (titleBtn) titleBtn.addEventListener("click", openBookPanel);

    const closeBtn = document.getElementById("book-panel-close");
    if (closeBtn) closeBtn.addEventListener("click", closeBookPanel);

    const overlay = document.getElementById("book-overlay");
    if (overlay) overlay.addEventListener("click", closeBookPanel);

    document.querySelectorAll(".book-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            switchTestament(tab.dataset.testament);
        });
    });

    const topPrev = document.getElementById("top-prev");
    const topNext = document.getElementById("top-next");
    if (topPrev) topPrev.addEventListener("click", prevChapter);
    if (topNext) topNext.addEventListener("click", nextChapter);

    renderBooks("old");
}

/* ---------- Tab 切换 ---------- */
function switchTestament(testament) {
    window._currentTestament = testament;
    document.querySelectorAll(".book-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.testament === testament);
    });
    renderBooks(testament);
}

/* ---------- 渲染左侧书卷列表 ---------- */
function renderBooks(testament) {
    const list = document.getElementById("book-list");
    if (!list) return;

    const config = window._bookCategories[testament];
    const books = window._allBooks.filter(b => b.testament === testament);

    list.innerHTML = "";

    config.categories.forEach(cat => {
        const catBooks = books.filter(b => b.category === cat.key);
        if (catBooks.length === 0) return;

        const catTitle = document.createElement("div");
        catTitle.className = "book-cat-title";
        catTitle.textContent = cat.label;
        list.appendChild(catTitle);

        const grid = document.createElement("div");
        grid.className = "book-grid";

        catBooks.forEach(book => {
            const item = document.createElement("button");
            item.className = "book-item";
            item.textContent = book.short;
            item.title = book.name_cn;
            item.dataset.bookId = book.id;

            if (Number(Bible.book) === book.id) {
                item.classList.add("active");
            }

            item.addEventListener("click", () => selectBook(book));
            grid.appendChild(item);
        });

        list.appendChild(grid);
    });

    const currentBook = window._allBooks.find(b => b.id === Bible.book);
    if (currentBook && currentBook.testament === testament) {
        renderChapters(currentBook);
    } else {
        showChapterEmpty();
    }
}

/* ---------- 选中书卷（左侧点击） ---------- */
function selectBook(book) {
    Bible.book = book.id;
    const ch = Bible.chapter || 1;
    updateTopTitle(book, ch);

    document.querySelectorAll(".book-item").forEach(el => {
        el.classList.toggle("active", Number(el.dataset.bookId) === book.id);
    });

    // 加载该书卷的章节（默认跳到第1章）
    loadChaptersForBook(book.id, 1).then(() => {
        renderChapters(book);
    });
}

/* ---------- 加载指定书卷的章节 JSON（核心函数）---------- */
async function loadChaptersForBook(bookId, targetChapter, onReady) {
    const sel = document.getElementById("chapter");
    const abbr = getAbbr(bookId);
    const bookStr = String(bookId).padStart(2, "0");
    const url = `./static/chapters/${bookStr}_${abbr}.json`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("章节 JSON 不存在: " + url);
        const chapters = await res.json();

        // ✅ 存入内存真理源
        window._currentChapters = chapters;

        // 同步到隐藏 select（兼容）
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
        const requested = targetChapter || Bible.chapter || 1;
        const exists = chapters.some(c => Number(c.chapter) === Number(requested));
        const target = exists ? requested : chapters[0].chapter;

        Bible.chapter = target;
        if (sel) sel.value = target;

        // 更新顶部
        const book = window._allBooks.find(b => b.id === Number(bookId));
        if (book) updateTopTitle(book, target);

        // 加载经文 + 音频（透传 onReady）
        loadVerses(onReady);
        updateAudio();

        return chapters;
    } catch (err) {
        console.error("加载章节失败:", err);
        window._currentChapters = [];
        if (sel) sel.innerHTML = '<option value="">加载失败</option>';
        throw err;
    }
}

/* ---------- 渲染右侧章节网格 ---------- */
function renderChapters(book) {
    const header = document.getElementById("chapter-list-header");
    const list = document.getElementById("chapter-list");
    if (!list) return;

    if (header) header.textContent = book.name_cn;

    const chapters = window._currentChapters;
    if (!chapters || chapters.length === 0) {
        list.className = "chapter-list";
        list.innerHTML = '<div class="chapter-empty">加载中…</div>';
        return;
    }

    list.innerHTML = "";
    list.className = "chapter-grid";

    chapters.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "chapter-item";
        btn.textContent = item.chapter;
        btn.title = item.chapter_title || `第 ${item.chapter} 章`;

        if (Number(Bible.chapter) === Number(item.chapter)) {
            btn.classList.add("active");
        }

        btn.addEventListener("click", () => {
            selectChapter(book, item.chapter, btn);
        });
        list.appendChild(btn);
    });
}

/* ---------- 空状态 ---------- */
function showChapterEmpty() {
    const header = document.getElementById("chapter-list-header");
    const list = document.getElementById("chapter-list");
    if (header) header.textContent = "选择书卷";
    if (list) {
        list.className = "chapter-list";
        list.innerHTML = '<div class="chapter-empty">← 选择左侧书卷</div>';
    }
}

/* ---------- 选中章节（右侧点击） ---------- */
function selectChapter(book, chapter, btnEl) {
    Bible.chapter = chapter;

    document.querySelectorAll(".chapter-item").forEach(el => {
        el.classList.remove("active");
    });
    if (btnEl) btnEl.classList.add("active");

    const sel = document.getElementById("chapter");
    if (sel) sel.value = chapter;

    updateTopTitle(book, chapter);
    closeBookPanel();

    // 直接加载经文 + 音频
    loadVerses();
    updateAudio();
}

/* ---------- 更新顶部标题 ---------- */
function updateTopTitle(book, chapter) {
    const span = document.getElementById("book-btn-text");
    if (span) {
        const ch = chapter || Bible.chapter || 1;
        span.textContent = `${book.name_cn} ${ch}`;
    }
}

/* ---------- 打开 / 关闭面板 ---------- */
function openBookPanel() {
    const overlay = document.getElementById("book-overlay");
    const panel = document.getElementById("book-panel");
    if (!overlay || !panel) return;

    overlay.classList.add("open");
    panel.classList.add("open");

    const current = window._allBooks.find(b => b.id === Bible.book);
    const testament = current?.testament || "old";
    switchTestament(testament);
}

function closeBookPanel() {
    const overlay = document.getElementById("book-overlay");
    const panel = document.getElementById("book-panel");
    if (overlay) overlay.classList.remove("open");
    if (panel) panel.classList.remove("open");
}

/* ---------- onBookChange（兼容搜索跳转） ---------- */
function onBookChange(bookId) {
    if (!bookId) return;
    const targetCh = Bible.chapter || 1;
    loadChaptersForBook(bookId, targetCh);
}
