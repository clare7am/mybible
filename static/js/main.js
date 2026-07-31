/**
 * 全局状态
 */
window.Bible = {
    book: null,
    chapter: null
};

/**
 * 页面加载完成后初始化
 */
window.addEventListener("DOMContentLoaded", () => {
    initBookSelector();
});
