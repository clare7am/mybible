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
    const bookSelect = document.getElementById("book");
    const chapterSelect = document.getElementById("chapter");

    if (!bookSelect || !chapterSelect) {
        console.warn("book 或 chapter select 不存在");
        return;
    }

    // 清空原有 option（防止后端渲染残留）
    bookSelect.innerHTML = '<option value="">加载中...</option>';
    chapterSelect.innerHTML = '<option value="">请先选择书卷</option>';
    chapterSelect.disabled = true;

    // ✅ 从 JSON 加载书卷
    fetch("./static/books.json")
        .then(res => {
            if (!res.ok) {
                throw new Error("books.json 加载失败");
            }
            return res.json();
        })
        .then(books => {
            bookSelect.innerHTML = '';

            books.forEach(b => {
                const option = document.createElement("option");
                option.value = b.id;
                option.textContent = b.name_cn;
                bookSelect.appendChild(option);
            });

            // 默认选中第一卷
            const firstBook = books[0];
            bookSelect.value = firstBook.id;

            // 初始化全局状态
            Bible.book = firstBook.id;

            // ✅ 触发书卷切换（会自动加载章节 + 经文）
            onBookChange(bookSelect);
        })
        .catch(err => {
            bookSelect.innerHTML = '<option value="">书卷加载失败</option>';
            console.error(err);
        });
});