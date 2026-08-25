const BYTES_PER_KB = 1024;
const EDITOR_MAX_MB = 5;
const COPY_MAX_MB = 2;
const PERSIST_MAX_MB = 5;

export const BYTES_PER_UNIT = BYTES_PER_KB;
export const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
export const EDITOR_MAX_BYTES = EDITOR_MAX_MB * BYTES_PER_MB;
export const COPY_MAX_CHARS = COPY_MAX_MB * BYTES_PER_MB;
export const CHILDREN_PAGE_SIZE = 200;
export const SEARCH_MAX_RESULTS = 200;
export const PERSIST_MAX_BYTES = PERSIST_MAX_MB * BYTES_PER_MB;
export const MAX_TABS = 8;
export const DIFF_MAX_CHANGES = 500;
export const INDENT_SPACES = 2;
