import { useRef, useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Upload, Loader2 } from 'lucide-react';

interface ImportMarkdownButtonProps {
  editor: Editor | null;
  disabled?: boolean;
  onImported?: () => void;
}

/**
 * Parses a simple Markdown string into TipTap JSON document structure.
 * Handles headings, bold, italic, links, lists, blockquotes, horizontal rules, and paragraphs.
 */
function parseMarkdownToTiptap(md: string): Record<string, any> {
  const lines = md.split('\n');
  const content: Array<Record<string, any>> = [];
  let i = 0;

  const parseInline = (text: string): Array<Record<string, any>> => {
    const nodes: Array<Record<string, any>> = [];
    // Regex for bold, italic, links, and plain text
    const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)|([^*[\]]+))/g;
    let match: RegExpExecArray | null;
    while ((match = inlineRegex.exec(text)) !== null) {
      if (match[2]) {
        // Bold
        nodes.push({ type: 'text', text: match[2], marks: [{ type: 'bold' }] });
      } else if (match[3]) {
        // Italic
        nodes.push({ type: 'text', text: match[3], marks: [{ type: 'italic' }] });
      } else if (match[4] && match[5]) {
        // Link
        nodes.push({
          type: 'text',
          text: match[4],
          marks: [{ type: 'link', attrs: { href: match[5], target: '_blank' } }],
        });
      } else if (match[6]) {
        // Plain text
        nodes.push({ type: 'text', text: match[6] });
      }
    }
    if (nodes.length === 0 && text.trim()) {
      nodes.push({ type: 'text', text });
    }
    return nodes;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      content.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: parseInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)/.test(line.trim())) {
      content.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const text = line.replace(/^>\s*/, '');
      content.push({
        type: 'blockquote',
        content: [{ type: 'paragraph', content: parseInline(text) }],
      });
      i++;
      continue;
    }

    // Unordered list
    if (/^\s*[-•*]\s+/.test(line)) {
      const items: Array<Record<string, any>> = [];
      while (i < lines.length && /^\s*[-•*]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*[-•*]\s+/, '');
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(text) }],
        });
        i++;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: Array<Record<string, any>> = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*\d+\.\s+/, '');
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(text) }],
        });
        i++;
      }
      content.push({ type: 'orderedList', content: items });
      continue;
    }

    // Paragraph (default)
    content.push({
      type: 'paragraph',
      content: parseInline(line),
    });
    i++;
  }

  return { type: 'doc', content };
}

/**
 * Import Markdown button that opens a file picker for .md files,
 * parses the content, and inserts it into the TipTap editor.
 */
export const ImportMarkdownButton = ({ editor, disabled, onImported }: ImportMarkdownButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const doc = parseMarkdownToTiptap(text);

        // If document has existing content, ask for confirmation
        const currentContent = editor.getText().trim();
        if (currentContent.length > 0) {
          const confirmed = window.confirm(
            'This will replace the current document content. Continue?',
          );
          if (!confirmed) {
            setIsImporting(false);
            return;
          }
        }

        editor.commands.setContent(doc);
        onImported?.();
      } catch (err) {
        console.error('Failed to import markdown:', err);
        alert('Failed to import the Markdown file. Please check the file format.');
      } finally {
        setIsImporting(false);
        // Reset file input so same file can be re-imported
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [editor, onImported],
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isImporting}
        className="inline-flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
        title="Import Markdown file"
      >
        {isImporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
      </button>
    </>
  );
};
