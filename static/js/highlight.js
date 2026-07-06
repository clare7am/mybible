/**
 * 清除所有高亮
 */
function clearWordHighlight() {
    document.querySelectorAll('.word.active')
        .forEach(el => el.classList.remove('active'));
}

/**
 * 根据当前时间（毫秒）高亮单词
 * @param {number} currentTimeMs
 */
function highlightWordAt(currentTimeMs) {
    clearWordHighlight();

    let activeAlignId = null;

    document.querySelectorAll('.word[data-align-id]').forEach(el => {
        const start = Number(el.dataset.start);
        const end = Number(el.dataset.end);

        if (!start || !end) return;

        if (currentTimeMs >= start && currentTimeMs < end) {
            el.classList.add('active');
            activeAlignId = el.dataset.alignId;
        }
    });

    // ✅ 只高亮一个词（防抖动）
    if (activeAlignId) {
        const activeEl = document.querySelector(
            `.word[data-align-id="${activeAlignId}"]`
        );
        if (activeEl) {
            activeEl.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
}