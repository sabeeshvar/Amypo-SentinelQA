/**
 * Utility functions for rendering Markdown and parsing source citations
 * in 100% offline edge mode without external dependencies.
 */

export function cleanSourceTags(text) {
  if (!text) return '';
  return String(text)
    // Remove inline citation tags like [Source 1: placement_eligibility.md] or [Source 1]
    .replace(/\[Source\s*\d*[^\]]*\]/gi, '')
    // Remove bracketed numeric reference tags like [1], [2]
    .replace(/\[\d+\]/g, '')
    // Clean up excessive whitespace
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function parseSourceItem(src, index = 0) {
  const recordId = src?.record_id || '';
  let filename = recordId;
  let chunkLabel = '';

  if (recordId.includes('_chunk_')) {
    const parts = recordId.split('_chunk_');
    filename = parts[0];
    chunkLabel = `Chunk #${parts[1]}`;
  } else if (recordId.includes('.')) {
    const match = recordId.match(/^(.*\.(?:md|txt|pdf|docx|json))(_.*)?$/i);
    if (match) {
      filename = match[1];
      chunkLabel = match[2] ? match[2].replace(/^_/, 'Chunk ') : '';
    }
  }

  return {
    citationNumber: index + 1,
    filename: filename || 'Unknown Document',
    recordId: recordId,
    chunkLabel: chunkLabel,
    snippet: src?.snippet || ''
  };
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderMarkdown(md) {
  if (!md) return '';

  // 1. Unescape raw escaped characters: \* -> *, \_ -> _, \# -> #, \` -> `
  let text = String(md).replace(/\\([*_#`~[\]()])/g, '$1');

  // 2. Remove inline citation markers from main answer text
  text = cleanSourceTags(text);

  // 3. Normalize newlines
  text = text.replace(/\r\n/g, '\n');

  // 4. Ensure headings (### Heading) start on their own new lines
  text = text.replace(/([^\n#])\s+(#{1,6}\s+[^\n]+)/g, '$1\n\n$2');

  // Ensure bold section titles like "**Title:**" start on new lines after sentence endings or intro clauses
  text = text.replace(/([A-Za-z)\]"']\s*[.:;!?]\s+)(\*\*[^*]+:\*\*)/g, '$1\n\n$2');
  text = text.replace(/^(Based on [^:\n]+:\s*)(\*\*[^*]+:\*\*)/gim, '$1\n\n$2');

  // Ensure bullet points start on new lines
  text = text.replace(/([.!?:]|\))\s+([-•]|\*(?!\*))\s+/g, '$1\n$2 ');

  const lines = text.split('\n');
  const out = [];
  let inUl = false;
  let inOl = false;

  function closeLists() {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  }

  function inlineFormat(str) {
    if (!str) return '';
    let s = escapeHtml(str);

    // Inline code `code`
    s = s.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs">$1</code>');

    // Bold (**text** or __text__)
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-100">$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong class="font-bold text-slate-100">$1</strong>');

    // Italic (*text* or _text_)
    s = s.replace(/(^|[^\w*])\*([^*\s][^*]*[^*\s]|\w)\*(?=[^\w*]|$)/g, '$1<em class="italic text-slate-300">$2</em>');
    s = s.replace(/(^|[^\w_])_([^_\s][^_]*[^_\s]|\w)_(?=[^\w_]|$)/g, '$1<em class="italic text-slate-300">$2</em>');

    // Strikethrough ~~text~~
    s = s.replace(/~~([^~]+)~~/g, '<del class="line-through text-slate-500">$1</del>');

    // Cleanup lingering backslashes
    s = s.replace(/\\([*_#`~])/g, '$1');

    return s;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      closeLists();
      continue;
    }

    // Horizontal rule
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeLists();
      out.push('<hr class="my-3 border-slate-800" />');
      continue;
    }

    // Headings
    const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      closeLists();
      const level = hMatch[1].length;
      const content = inlineFormat(hMatch[2]);
      if (level === 1) {
        out.push(`<h1 class="text-base font-bold text-white mt-3.5 mb-2">${content}</h1>`);
      } else if (level === 2) {
        out.push(`<h2 class="text-sm sm:text-base font-bold text-slate-100 mt-3 mb-1.5">${content}</h2>`);
      } else if (level === 3) {
        out.push(`<h3 class="text-xs sm:text-sm font-semibold text-indigo-300 mt-2.5 mb-1">${content}</h3>`);
      } else {
        out.push(`<h4 class="text-xs font-semibold text-indigo-300 mt-2 mb-1">${content}</h4>`);
      }
      continue;
    }

    // Unordered list item: - item, * item, • item
    const ulMatch = trimmed.match(/^([-•]|\*(?!\*))\s+(.*)$/);
    if (ulMatch) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) {
        out.push('<ul class="list-disc pl-5 my-2 space-y-1 text-slate-200">');
        inUl = true;
      }
      out.push(`<li>${inlineFormat(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered list item: 1. item, 2. item
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) {
        out.push('<ol class="list-decimal pl-5 my-2 space-y-1 text-slate-200">');
        inOl = true;
      }
      out.push(`<li>${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    // Standalone bold header/label: **Heading:**
    const boldHeaderMatch = trimmed.match(/^(\*\*[^*]+:\*\*)\s*(.*)$/);
    if (boldHeaderMatch) {
      closeLists();
      const label = inlineFormat(boldHeaderMatch[1]);
      const rest = boldHeaderMatch[2] ? ` ${inlineFormat(boldHeaderMatch[2])}` : '';
      out.push(`<div class="font-semibold text-indigo-300 mt-2.5 mb-1">${label}${rest}</div>`);
      continue;
    }

    // Standard paragraph
    closeLists();
    out.push(`<p class="my-1.5 leading-relaxed text-slate-200">${inlineFormat(trimmed)}</p>`);
  }

  closeLists();
  return out.join('\n');
}
