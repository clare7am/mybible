function applyEntityStyles() {
    document
        .querySelectorAll(".verse-text span[data-entity-key]")
        .forEach(span => {
            if (!span.classList.contains("entity")) {
                span.classList.add("entity");
                span.title = span.dataset.entityKey;
            }
        });
}
