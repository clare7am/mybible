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
    const info = document.getElementById("info");

    // 更新全局状态
    Bible.book = bookSelect.value;
    Bible.chapter = chapter;

    // 更新提示文字
    if (info) {
        const bookName = bookSelect.options[bookSelect.selectedIndex].text;
        info.innerText = `当前：${bookName} 第 ${chapter} 章`;
    }

    // ✅ 加载经文（JSON）
    loadVerses();

    // ✅ 更新音频
    updateAudio();
}