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

/**
 * 书卷切换时，动态加载章节（JSON 版）
 */
function onBookChange(sel) {
    const bookId = sel.value;
    const chapterSelect = document.getElementById("chapter");
    const info = document.getElementById("info");

    // 清空章节下拉
    chapterSelect.innerHTML = '<option value="">加载中...</option>';
    chapterSelect.disabled = true;

    if (!bookId) {
        chapterSelect.innerHTML = '<option value="">请先选书卷</option>';
        if (info) info.innerText = "请选择书卷";
        return;
    }

    const abbr = getAbbr(bookId);
    const bookStr = String(bookId).padStart(2, "0");
    const url = `./static/chapters/${bookStr}_${abbr}.json`;

    fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error("章节 JSON 不存在");
            }
            return res.json();
        })
        .then(chapters => {
            chapterSelect.innerHTML = '';

            chapters.forEach(item => {
                const option = document.createElement("option");
                option.value = item.chapter;

                // 优先使用 chapter_title
                option.innerText = item.chapter_title?.trim()
                    ? item.chapter_title
                    : item.chapter;

                chapterSelect.appendChild(option);
            });

            chapterSelect.disabled = false;

            // 默认选中第一章
            const firstChapter = chapters[0]?.chapter;
            chapterSelect.value = firstChapter;

            // 触发章节切换
            onChapterChange(chapterSelect);
        })
        .catch(err => {
            chapterSelect.innerHTML = '<option value="">加载失败</option>';
            console.error("加载章节失败:", err);
        });

    // 更新提示文字
    if (info) {
        const bookName = sel.options[sel.selectedIndex].text;
        info.innerText = `已选择：${bookName}`;
    }

    // 重新加载经文
    loadVerses();
}