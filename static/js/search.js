/* ========= 中文经文搜索（基于 verse_index.json）========= */
let bibleIndex = null;
let bibleIndexLoading = false;

async function buildBibleIndex() {
    // 已加载过且有效
    if (bibleIndex && bibleIndex.length > 0) return bibleIndex;

    // 正在加载 → 等待（最多30秒）
    if (bibleIndexLoading) {
        let waited = 0;
        while (bibleIndexLoading && waited < 30000) {
            await new Promise(r => setTimeout(r, 100));
            waited += 100;
        }
        return bibleIndex; // 可能是 null 或 []
    }

    bibleIndexLoading = true;

    try {
        const resp = await fetch(
            'https://c7-json.oss-cn-beijing.aliyuncs.com/verse_index.json'
        );
        if (!resp.ok) throw new Error('verse_index.json 加载失败: HTTP ' + resp.status);

        const data = await resp.json();

        const bookMap = {};
        if (window._allBooks && window._allBooks.length > 0) {
            window._allBooks.forEach(b => {
                bookMap[b.id] = b.name_cn;
            });
        }

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
        bibleIndex = null; // ✅ 关键：设为 null 而不是 []，下次可重试
    } finally {
        bibleIndexLoading = false;
    }

    return bibleIndex;
}

/* ========= 搜索核心（分页加载）========= */
async function doSearch(keyword) {
    const kw = keyword.trim();
    const container = document.getElementById('search-results');
    if (!kw) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    // 显示 loading（每次搜索都先显示，避免残留旧内容）
    container.innerHTML = '<div class="search-loading">正在建立搜索索引（首次较慢）…</div>';

    try {
        const index = await buildBibleIndex();

        // 如果 container 已被清空（用户删了输入），就不继续
        if (!container.isConnected || container.style.display === 'none') return;

        if (!index || index.length === 0) {
            container.innerHTML = `<div class="search-empty">搜索索引加载失败，请检查网络后重试</div>`;
            return;
        }

        const norm = s => s.normalize('NFC').replace(/愛/g, '爱');
        const kwNorm = norm(kw);

        const hits = index.filter(r =>
            r.text_cn && norm(r.text_cn).includes(kwNorm)
        );

        if (hits.length === 0) {
            container.innerHTML = `<div class="search-empty">未找到「${escapeHtml(kw)}」</div>`;
            return;
        }

        // 清空 loading，开始渲染
        container.innerHTML = '';

        // 结果计数头部
        const header = document.createElement('div');
        header.className = 'search-result-header';
        header.textContent = `找到 ${hits.length} 节`;
        container.appendChild(header);

        const ul = document.createElement('ul');
        ul.className = 'search-result-list';
        container.appendChild(ul);

        let rendered = 0;
        const PAGE = 200;

        function renderNextBatch() {
            if (rendered >= hits.length) return;

            const slice = hits.slice(rendered, rendered + PAGE);

            slice.forEach(r => {
                const li = document.createElement('li');
                li.className = 'search-result-item';
                li.innerHTML =
                    `<span class="search-result-ref">${r.ref}</span>` +
                    `<span class="search-result-text">${escapeHtml(r.text_cn)}</span>`;
                li.onclick = () => {
                    jumpToVerse(r.bookId, r.chapter, r.verse);
                };
                ul.appendChild(li);
            });

            rendered += slice.length;

            const oldMore = ul.querySelector('.load-more');
            if (oldMore) oldMore.remove();

            if (rendered < hits.length) {
                const more = document.createElement('li');
                more.textContent = '加载更多…';
                more.className = 'load-more';
                more.onclick = renderNextBatch;
                ul.appendChild(more);
            }
        }

        renderNextBatch();
    } catch (e) {
        container.innerHTML = `<div class="search-empty">搜索失败，请重试</div>`;
        console.error(e);
    }
}

/* ========= 跳转到经文（onReady 回调版，100% 稳定）========= */
function jumpToVerse(bookId, chapter, verse) {
    // 关闭搜索面板
    const overlay = document.getElementById('search-overlay');
    const sidebar = document.getElementById('search-sidebar');
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    if (overlay) overlay.classList.remove('open');
    if (sidebar) sidebar.classList.remove('open');
    if (input) input.value = '';
    if (results) {
        results.innerHTML = '';
        results.style.display = 'none';
    }

    // 设置目标
    Bible.book = bookId;
    Bible.chapter = chapter;

    // ✅ 先加载章节 JSON（同步完 select）
    loadChaptersForBook(bookId, chapter).then(() => {

        // 更新 select
        const chSel = document.getElementById('chapter');
        if (chSel) chSel.value = chapter;

        // ✅ 关键：loadVerses 传入 onReady 回调
        // 经文渲染完成后才会执行 → 100% 稳定
        loadVerses(() => {
            // 用 requestAnimationFrame 确保 DOM 已布局
            requestAnimationFrame(() => {
                const blocks = document.querySelectorAll('.verse-block');
                if (blocks.length === 0) {
                    console.warn('跳转：经文未渲染');
                    return;
                }

                let found = false;
                blocks.forEach(block => {
                    const num = block.querySelector('.verse-num');
                    if (num && Number(num.textContent) === verse) {
                        found = true;
                        block.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        block.classList.add('verse-highlight');
                        setTimeout(() => {
                            block.classList.remove('verse-highlight');
                        }, 2200);
                    }
                });

                // 没找到精确 verse → 至少滚到章节顶部
                if (!found && blocks[0]) {
                    blocks[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

    }).catch(e => {
        console.error('跳转加载失败:', e);
    });
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
        if (overlay) overlay.classList.add('open');
        if (sidebar) sidebar.classList.add('open');
        if (input) input.focus();
    }

    function closeSidebar() {
        if (overlay) overlay.classList.remove('open');
        if (sidebar) sidebar.classList.remove('open');
        if (input) input.value = '';
        if (results) {
            results.innerHTML = '';
            results.style.display = 'none';
        }
    }

    if (toggle) toggle.onclick = () => openSidebar();
    if (closeBtn) closeBtn.onclick = () => closeSidebar();
    if (overlay) overlay.onclick = () => closeSidebar();

    if (input) {
        input.addEventListener('input', () => {
            clearTimeout(timer);
            const kw = input.value.trim();
            if (!kw) {
                if (results) results.innerHTML = '';
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
    }
});
