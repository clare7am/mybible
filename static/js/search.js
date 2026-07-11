/* ========= 中文经文搜索（基于 verse_index.json）========= */
let bibleIndex = null;
let bibleIndexLoading = false;

async function buildBibleIndex() {
    if (bibleIndex) return bibleIndex;
    if (bibleIndexLoading) {
        while (bibleIndexLoading) await new Promise(r => setTimeout(r, 50));
        return bibleIndex;
    }

    bibleIndexLoading = true;

    try {
        const resp = await fetch(
            'https://c7-json.oss-cn-beijing.aliyuncs.com/verse_index.json'
        );
        if (!resp.ok) throw new Error('verse_index.json 加载失败');

        const data = await resp.json();

        const bookMap = {};
        document.querySelectorAll('#book option').forEach(opt => {
            bookMap[opt.value] = opt.text;
        });

        bibleIndex = data.map(v => ({
            bookId: v.book_id,
            bookName: bookMap[v.book_id] || `卷${v.book_id}`,
            chapter: v.chapter,
            verse: v.verse,
            text_cn: v.text_cn,
            ref: `${bookMap[v.book_id] || ''} ${v.chapter}:${v.verse}`
        }));

        console.log(`✅ 搜索索引加载完成，共 ${bibleIndex.length} 节`);
    } catch (e) {
        console.error('搜索索引加载失败:', e);
        bibleIndex = [];
    } finally {
        bibleIndexLoading = false;
    }

    return bibleIndex;
}

/* ========= 搜索核心（已加入分页加载）========= */
async function doSearch(keyword) {
    const kw = keyword.trim();
    const container = document.getElementById('search-results');
    if (!kw) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = '<p>正在建立搜索索引（首次较慢）…</p>';

    try {
        const index = await buildBibleIndex();

        if (!index || index.length === 0) {
            container.innerHTML = `<p>搜索索引尚未就绪，请稍后重试</p>`;
            return;
        }

        // ✅ Unicode 归一 + 繁简兼容（关键）
        const norm = s => s.normalize('NFC').replace(/愛/g, '爱');
        const kwNorm = norm(kw);

        const hits = index.filter(r =>
            r.text_cn && norm(r.text_cn).includes(kwNorm)
        );

        if (hits.length === 0) {
            container.innerHTML = `<p>未找到「${kw}」</p>`;
            return;
        }

        container.innerHTML = `<p>找到 ${hits.length} 节：</p>`;
        const ul = document.createElement('ul');
        ul.style.paddingLeft = '1em';
        container.appendChild(ul);

        /* ===== 分页状态 ===== */
        let rendered = 0;
        const PAGE = 200;

        function renderNextBatch() {
            // ✅ 防止重复渲染
            if (rendered >= hits.length) return;

            const slice = hits.slice(rendered, rendered + PAGE);

            slice.forEach(r => {
                const li = document.createElement('li');
                li.style.cursor = 'pointer';
                li.style.marginBottom = '6px';
                li.innerHTML = `<b>${r.ref}</b><br>${escapeHtml(r.text_cn)}`;
                li.onclick = () => {
                    jumpToVerse(r.bookId, r.chapter, r.verse);
                };
                ul.appendChild(li);
            });

            rendered += slice.length;

            // ✅ 移除旧的“加载更多”
            const oldMore = ul.querySelector('.load-more');
            if (oldMore) oldMore.remove();

            // ✅ 添加新按钮
            if (rendered < hits.length) {
                const more = document.createElement('li');
                more.textContent = '加载更多…';
                more.className = 'load-more';
                more.style.cursor = 'pointer';
                more.style.listStyle = 'none';
                more.style.padding = '8px 0';
                more.style.color = '#007aff';
                more.onclick = renderNextBatch;
                ul.appendChild(more);
            }
        }

        // ✅ 首次渲染
        renderNextBatch();
    } catch (e) {
        container.innerHTML = `<p>搜索失败，请重试</p>`;
        console.error(e);
    }
}

/* ========= 跳转到经文 ========= */
function jumpToVerse(bookId, chapter, verse) {
    const bookSel = document.getElementById('book');
    const chSel = document.getElementById('chapter');

    bookSel.value = bookId;
    onBookChange(bookSel);

    const wait = setInterval(() => {
        if (chSel.options.length > 0) {
            clearInterval(wait);
            chSel.value = chapter;
            onChapterChange(chSel);

            setTimeout(() => {
                document.querySelectorAll('.verse-block').forEach(block => {
                    const num = block.querySelector('.verse-num');
                    if (num && Number(num.textContent) === verse) {
                        block.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        block.classList.add('verse-highlight');
                        setTimeout(() => {
                            block.classList.remove('verse-highlight');
                        }, 2200);
                    }
                });
            }, 300);
        }
    }, 50);
}

/* ========= 工具函数 ========= */
function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ========= 侧边栏控制 ========= */
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('search-toggle');
    const sidebar = document.getElementById('search-sidebar');
    const overlay = document.getElementById('search-overlay');
    const closeBtn = document.getElementById('search-close');
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');

    let timer = null;

    function openSidebar() {
        overlay.classList.add('open');
        sidebar.classList.add('open');
        input.focus();
    }

    function closeSidebar() {
        overlay.classList.remove('open');
        sidebar.classList.remove('open');
        input.value = '';
        results.style.display = 'none';
    }

    toggle.onclick = () => openSidebar();
    closeBtn.onclick = () => closeSidebar();
    overlay.onclick = () => closeSidebar();

    input.addEventListener('input', () => {
        clearTimeout(timer);
        const kw = input.value.trim();
        if (!kw) {
            results.innerHTML = '';
            return;
        }
        openSidebar();
        timer = setTimeout(() => doSearch(kw), 300);
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            clearTimeout(timer);
            doSearch(input.value.trim());
        }
    });
});