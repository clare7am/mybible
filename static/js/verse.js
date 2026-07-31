// 添加这个函数定义
function getAbbr(bookId) {
    const abbrMap = {
        1: "Gen", 2: "Ex", 3: "Lev", 4: "Num", 5: "Dt",
        6: "Jos", 7: "Jdg", 8: "Ru", 9: "1S", 10: "2S",
        11: "1K", 12: "2K", 13: "1Chr", 14: "2Chr",
        15: "Ezra", 16: "Ne", 17: "Tb", 18: "Jdt", 19: "Es",
        20: "1Mac", 21: "2Mac", 22: "Job", 23: "Ps", 24: "Pro",
        25: "Ecl", 26: "Song", 27: "Wis", 28: "Sir", 29: "Is",
        30: "Jer", 31: "Lm", 32: "Bar", 33: "Ezk", 34: "Dn",
        35: "Hos", 36: "Jl", 37: "Am", 38: "Ob", 39: "Jon",
        40: "Mic", 41: "Nh", 42: "Hb", 43: "Zep", 44: "Hg",
        45: "Zec", 46: "Mal", 47: "Mt", 48: "Mk", 49: "Lk",
        50: "Jn", 51: "Acts", 52: "Rom", 53: "1Cor", 54: "2Cor",
        55: "Gal", 56: "Eph", 57: "Phil", 58: "Col", 59: "1Thes",
        60: "2Thes", 61: "1Tim", 62: "2Tim", 63: "Tit", 64: "Phlm",
        65: "Heb", 66: "Jas", 67: "1P", 68: "2P", 69: "1Jn",
        70: "2Jn", 71: "3Jn", 72: "Jd", 73: "Rev"
    };
    return abbrMap[bookId] || "";
}

const OSS_JSON_BASE = "https://c7-json.oss-cn-beijing.aliyuncs.com";

function getOssJsonUrl(bookId, chapter) {
    const abbr = getAbbr(bookId);
    const bookStr = String(bookId).padStart(2, "0");
    const chapterStr = String(chapter).padStart(3, "0");
    return `${OSS_JSON_BASE}/${bookStr}_${abbr}_${chapterStr}.json?v=${window.APP_VERSION}`;
}

/* ========= 加载经文（支持 onReady 回调）========= */
function loadVerses(onReady) {
    const bookId = Bible.book;
    const chapter = Bible.chapter;
    const container = document.getElementById("verses");

    if (!bookId || !chapter) {
        container.innerHTML = "";
        onReady && onReady();
        return;
    }

    container.innerHTML = "<p>加载中...</p>";

    const ossUrl = getOssJsonUrl(bookId, chapter);

    fetch(ossUrl)
        .then(res => {
            if (!res.ok) throw new Error("OSS JSON 不存在");
            return res.json();
        })
        .then(data => {
            console.log("✅ OSS 分词 JSON");
            renderOssVerses(data.verses, container, onReady);
        })
        .catch(() => {
            console.warn("⚠️ 回退到本地 JSON");
            loadLocalVerses(bookId, chapter, container, onReady);
        });
}

function loadLocalVerses(bookId, chapter, container, onReady) {
    const url = `./static/verses/${String(bookId).padStart(2, "0")}_${String(chapter).padStart(3, "0")}.json`;

    console.log("尝试加载本地 JSON:", url);

    fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error("Local JSON not found");
            }
            return res.json();
        })
        .then(data => {
            renderPlainVerses(data, container, onReady);
        })
        .catch(err => {
            console.error("本地经文加载失败:", err);
            container.innerHTML = "<p>加载失败：未找到本地经文文件</p>";
            onReady && onReady();
        });
}

/* ========= 分词渲染（OSS） ========= */
function renderOssVerses(verses, container, onReady) {
    container.innerHTML = "";
    let index = 0;
    const BATCH_SIZE = 3;

    function renderBatch() {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < BATCH_SIZE && index < verses.length; i++, index++) {
            const v = verses[index];
            const block = document.createElement("div");
            block.className = "verse-block";

            const num = document.createElement("div");
            num.className = "verse-num";
            num.textContent = v.verse;

            const text = document.createElement("div");
            text.className = "verse-text";

            v.words.forEach(w => {
                const span = document.createElement("span");
                span.className = w.type || "";
                span.textContent = w.word;
                span.dataset.alignId = w.align_id || "";
                span.dataset.start = w.start || 0;
                span.dataset.end = w.end || 0;
                if (w.entity_key) {
                    span.dataset.entityKey = w.entity_key;
                }
                text.appendChild(span);
            });

            const cn = document.createElement("div");
            cn.className = "verse-cn";
            cn.textContent = v.text_cn;

            block.appendChild(num);
            block.appendChild(text);
            block.appendChild(cn);
            frag.appendChild(block);
        }
        container.appendChild(frag);

        if (index < verses.length) {
            requestAnimationFrame(renderBatch);
        } else {
            // ✅ 全部渲染完成，通知调用方
            onReady && onReady();
        }
    }
    renderBatch();
}

/* ========= 纯文本渲染（本地） ========= */
function renderPlainVerses(data, container, onReady) {
    container.innerHTML = data.map(v => `
        <div class="verse-block">
            <div class="verse-num">${v.verse}</div>
            <div class="verse-text">${v.text_en}</div>
            <div class="verse-cn">${v.text_cn}</div>
        </div>
    `).join("");

    // ✅ 渲染完成，通知调用方
    onReady && onReady();
}
