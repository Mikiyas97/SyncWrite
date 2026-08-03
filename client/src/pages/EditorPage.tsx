import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import LinkExtension from '@tiptap/extension-link';
import { RemoteCursorExtension } from '../extensions/CursorExtension';
import { SearchHighlightExtension } from '../extensions/SearchHighlight';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { PresenceAvatars } from '../components/editor/PresenceAvatars';
import { FindReplaceBar } from '../components/editor/FindReplaceBar';
import { KeyboardShortcutsModal } from '../components/editor/KeyboardShortcutsModal';
import { ImportMarkdownButton } from '../components/editor/ImportMarkdownButton';
import { ShareModal } from '../components/documents/ShareModal';
import { VersionHistoryPanel } from '../components/editor/VersionHistoryPanel';
import { CommentsPanel } from '../components/editor/CommentsPanel';
import { getDocument, updateDocumentContent, renameDocument } from '../services/documentService';
import { createManualVersion } from '../services/versionService';
import { useSocket, useDocumentSocket } from '../hooks/useSocket';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAuth } from '../hooks/useAuth';
import type { Document } from '../types/document';
import {
  ArrowLeft,
  Cloud,
  CloudOff,
  Loader2,
  AlertCircle,
  Check,
  CircleDot,
  RefreshCw,
  Share2,
  Eye,
  Lock,
  History,
  MessageSquare,
  Save,
  Download,
  Keyboard,
  Search,
} from 'lucide-react';

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 2000;
const SAVED_DISPLAY_MS = 3000;
const CURSOR_THROTTLE_MS = 100;

export const EditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [title, setTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isFindBarOpen, setIsFindBarOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Panel state: only one panel open at a time
  type ActivePanel = 'none' | 'versions' | 'comments';
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [isPreviewingVersion, setIsPreviewingVersion] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const liveContentRef = useRef<Record<string, any> | null>(null);

  // ---- Permission Derivation ----
  const currentUserId = user?._id;
  const isOwner = document ? document.owner._id === currentUserId : false;
  const userCollaborator = document?.collaborators.find(
    (c) => c.user._id === currentUserId
  );
  const userRole = isOwner ? 'owner' : (userCollaborator?.role || 'viewer');
  const canEdit = isOwner || userRole === 'editor';

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentInitializedRef = useRef(false);
  const pendingContentRef = useRef<Record<string, any> | null>(null);
  const isSavingRef = useRef(false);
  const isRemoteUpdateRef = useRef(false);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const cursorThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCursorRef = useRef<{ from: number; to: number } | null>(null);
  const lastEmittedCursorRef = useRef<{ from: number; to: number } | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ---- Socket.IO ----

  useSocket();

  const handleRemoteContent = useCallback((content: Record<string, any>, userId: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    console.log(`[Socket] Received remote content update from user ${userId}`);
    try {
      // Set flag so onUpdate and onSelectionUpdate know this is a remote change
      isRemoteUpdateRef.current = true;
      const { from, to } = ed.state.selection;
      ed.commands.setContent(content, { emitUpdate: false });

      // Restore local selection clamped to new document bounds
      const docSize = ed.state.doc.content.size;
      const minPos = 1;
      const maxPos = Math.max(1, docSize - 1);
      const newFrom = Math.min(Math.max(from, minPos), maxPos);
      const newTo = Math.min(Math.max(to, minPos), maxPos);
      ed.commands.setTextSelection({ from: newFrom, to: newTo });
    } finally {
      isRemoteUpdateRef.current = false;
    }
  }, []);

  const {
    activeUsers,
    remoteCursors,
    typingUsers,
    emitContentChange,
    emitCursorUpdate,
    emitTypingStart,
    emitTypingStop,
  } = useDocumentSocket(
    id,
    handleRemoteContent,
  );

  const emitContentChangeRef = useRef(emitContentChange);
  useEffect(() => {
    emitContentChangeRef.current = emitContentChange;
  }, [emitContentChange]);

  const emitCursorUpdateRef = useRef(emitCursorUpdate);
  useEffect(() => {
    emitCursorUpdateRef.current = emitCursorUpdate;
  }, [emitCursorUpdate]);

  const emitTypingStartRef = useRef(emitTypingStart);
  useEffect(() => {
    emitTypingStartRef.current = emitTypingStart;
  }, [emitTypingStart]);

  const emitTypingStopRef = useRef(emitTypingStop);
  useEffect(() => {
    emitTypingStopRef.current = emitTypingStop;
  }, [emitTypingStop]);

  // ---- Save logic ----

  const saveContent = useCallback(
    async (content: Record<string, any>) => {
      if (!id || isSavingRef.current) return;
      try {
        isSavingRef.current = true;
        setSaveStatus('saving');
        
        // Clear pending ref before saving. If user types during save, it will be populated again.
        pendingContentRef.current = null;
        await updateDocumentContent(id, content);
        setSaveStatus('saved');

        // Clear any existing "Saved" display timer
        if (savedDisplayTimerRef.current) {
          clearTimeout(savedDisplayTimerRef.current);
        }
        savedDisplayTimerRef.current = setTimeout(
          () => setSaveStatus('idle'),
          SAVED_DISPLAY_MS,
        );
      } catch {
        // Restore pending content on failure so it can be retried
        if (!pendingContentRef.current) {
          pendingContentRef.current = content;
        }
        setSaveStatus('error');
      } finally {
        isSavingRef.current = false;
        
        // If user typed while we were saving, schedule another save
        if (pendingContentRef.current && saveTimerRef.current === null) {
          setSaveStatus('unsaved');
          saveTimerRef.current = setTimeout(() => {
            saveTimerRef.current = null;
            if (pendingContentRef.current) {
              saveContent(pendingContentRef.current);
            }
          }, DEBOUNCE_MS);
        }
      }
    },
    [id],
  );

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (pendingContentRef.current) {
      await saveContent(pendingContentRef.current);
    }
  }, [saveContent]);

  const retrySave = useCallback(() => {
    if (pendingContentRef.current) {
      saveContent(pendingContentRef.current);
    }
  }, [saveContent]);

  // ---- Remote cursor extension options (memoized) ----
  const cursorExtensionOptions = useMemo(() => ({
    cursors: remoteCursors,
  }), [remoteCursors]);

  // ---- Editor ----

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
        },
      }),
      RemoteCursorExtension.configure(cursorExtensionOptions),
      SearchHighlightExtension,
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[800px] px-12 py-16 text-[17px] leading-relaxed',
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      if (!contentInitializedRef.current) return;

      // If this update came from a remote user, don't save or re-broadcast
      if (isRemoteUpdateRef.current) return;

      const json = updatedEditor.getJSON();
      pendingContentRef.current = json;

      // Broadcast to other users in the room
      emitContentChangeRef.current(json);

      // Emit typing start
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        emitTypingStartRef.current();
      }
      // Reset typing timeout
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        emitTypingStopRef.current();
      }, 2000);

      // Immediately show "unsaved" status
      setSaveStatus('unsaved');

      // Clear previous debounce timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Schedule save after debounce period
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        if (pendingContentRef.current) {
          saveContent(pendingContentRef.current);
        }
      }, DEBOUNCE_MS);
    },
    onSelectionUpdate: ({ editor: updatedEditor }) => {
      if (!contentInitializedRef.current || isRemoteUpdateRef.current) return;
      const { from, to } = updatedEditor.state.selection;

      // If throttled, store pending selection for trailing-edge emit
      if (cursorThrottleRef.current) {
        pendingCursorRef.current = { from, to };
        return;
      }

      // Emit immediately on leading edge
      lastEmittedCursorRef.current = { from, to };
      emitCursorUpdateRef.current({ from, to });

      cursorThrottleRef.current = setTimeout(() => {
        cursorThrottleRef.current = null;
        if (pendingCursorRef.current) {
          const pending = pendingCursorRef.current;
          pendingCursorRef.current = null;
          if (
            !lastEmittedCursorRef.current ||
            lastEmittedCursorRef.current.from !== pending.from ||
            lastEmittedCursorRef.current.to !== pending.to
          ) {
            lastEmittedCursorRef.current = pending;
            emitCursorUpdateRef.current(pending);
          }
        }
      }, CURSOR_THROTTLE_MS);
    },
  });

  // Update remote cursor decorations when remoteCursors changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const tr = editor.state.tr;
    tr.setMeta('updateRemoteCursors', {
      cursors: remoteCursors,
      currentUserId: currentUserId || user?._id,
    });
    editor.view.dispatch(tr);
  }, [editor, remoteCursors, currentUserId, user]);

  // ---- Fetch document ----

  useEffect(() => {
    if (!id) return;

    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const doc = await getDocument(id);
        setDocument(doc);
        setTitle(doc.title);
      } catch (err: any) {
        const message =
          err.response?.data?.message || 'Failed to load document';
        setLoadError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  // ---- Initialize editor content ----

  useEffect(() => {
    if (editor && document && !contentInitializedRef.current) {
      const content = document.content;
      if (content && typeof content === 'object' && content.type === 'doc') {
        editor.commands.setContent(content);
      }
      contentInitializedRef.current = true;
    }
  }, [editor, document]);

  // Keep editorRef in sync so the socket callback can access it
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync editor editable state based on permissions
  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit);
    }
  }, [editor, canEdit]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingContentRef.current && id) {
        e.preventDefault();
        
        // Use fetch with keepalive to reliably send the save request as the page unloads
        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        fetch(`${baseUrl}/documents/${id}/content`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: pendingContentRef.current }),
          keepalive: true,
          credentials: 'include'
        }).catch(err => console.error('Failed to flush save on unload:', err));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [id]);

  // ---- Cleanup timers on unmount ----

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedDisplayTimerRef.current) clearTimeout(savedDisplayTimerRef.current);
      if (cursorThrottleRef.current) clearTimeout(cursorThrottleRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // ---- Navigate back (flush first) ----

  const handleBack = useCallback(async () => {
    await flushSave();
    navigate('/dashboard');
  }, [flushSave, navigate]);

  // ---- Panel toggles ----

  const togglePanel = useCallback((panel: 'versions' | 'comments') => {
    setActivePanel((prev) => (prev === panel ? 'none' : panel));
    // If we're previewing a version and closing the panel, restore live content
    if (isPreviewingVersion) {
      setIsPreviewingVersion(false);
      if (editor && liveContentRef.current) {
        isRemoteUpdateRef.current = true;
        editor.commands.setContent(liveContentRef.current);
        isRemoteUpdateRef.current = false;
        editor.setEditable(canEdit);
        liveContentRef.current = null;
      }
    }
  }, [isPreviewingVersion, editor, canEdit]);

  const handlePreviewVersion = useCallback((content: Record<string, any>) => {
    if (!editor) return;
    // Save live content before previewing
    if (!liveContentRef.current) {
      liveContentRef.current = editor.getJSON();
    }
    setIsPreviewingVersion(true);
    editor.setEditable(false);
    isRemoteUpdateRef.current = true;
    editor.commands.setContent(content);
    isRemoteUpdateRef.current = false;
  }, [editor]);

  const handleClearPreview = useCallback(() => {
    if (!editor || !isPreviewingVersion) return;
    setIsPreviewingVersion(false);
    if (liveContentRef.current) {
      isRemoteUpdateRef.current = true;
      editor.commands.setContent(liveContentRef.current);
      isRemoteUpdateRef.current = false;
      liveContentRef.current = null;
    }
    editor.setEditable(canEdit);
  }, [editor, isPreviewingVersion, canEdit]);

  const handleRestoreVersion = useCallback((updatedDoc: any) => {
    setDocument(updatedDoc);
    setTitle(updatedDoc.title);
    setIsPreviewingVersion(false);
    liveContentRef.current = null;
    if (editor && updatedDoc.content) {
      isRemoteUpdateRef.current = true;
      editor.commands.setContent(updatedDoc.content);
      isRemoteUpdateRef.current = false;
      editor.setEditable(canEdit);
    }
  }, [editor, canEdit]);

  const handleSaveVersion = useCallback(async () => {
    if (!id || isSavingVersion) return;
    setIsSavingVersion(true);
    try {
      await flushSave();
      await createManualVersion(id);
    } catch (err) {
      console.error('Failed to save version:', err);
    } finally {
      setIsSavingVersion(false);
    }
  }, [id, isSavingVersion, flushSave]);

  const buildMarkdown = useCallback(() => {
    const content = editor?.getJSON()?.content || [];

    const renderInline = (nodes: Array<Record<string, any>> = []): string => {
      return (nodes || []).reduce((text: string, node: Record<string, any> | undefined) => {
        if (!node) return text;

        if (node.type === 'text') {
          let value = node.text || '';
          const marks = node.marks || [];
          const linkMark = marks.find((mark: Record<string, any>) => mark.type === 'link');

          if (linkMark?.attrs?.href) {
            value = `[${value}](${linkMark.attrs.href})`;
          }
          if (marks.some((mark: Record<string, any>) => mark.type === 'bold')) {
            value = `**${value}**`;
          }
          if (marks.some((mark: Record<string, any>) => mark.type === 'italic')) {
            value = `*${value}*`;
          }
          if (marks.some((mark: Record<string, any>) => mark.type === 'underline')) {
            value = `<u>${value}</u>`;
          }

          return text + value;
        }

        if (node.type === 'hardBreak') {
          return text + '\n';
        }

        if (node.content) {
          return text + renderInline(node.content);
        }

        return text;
      }, '');
    };

    const renderBlock = (node: Record<string, any>, listPrefix?: string): string[] => {
      if (!node) return [];

      switch (node.type) {
        case 'paragraph': {
          const text = renderInline(node.content || []);
          return text.trim() ? [text] : [];
        }
        case 'heading': {
          const level = node.attrs?.level || 1;
          const text = renderInline(node.content || []);
          return text.trim() ? [`${'#'.repeat(level)} ${text}`] : [];
        }
        case 'bulletList': {
          return (node.content || []).flatMap((item: Record<string, any>) => renderBlock(item, '•'));
        }
        case 'orderedList': {
          return (node.content || []).flatMap((item: Record<string, any>, index: number) => renderBlock(item, `${index + 1}.`));
        }
        case 'listItem': {
          const lines = (node.content || []).flatMap((child: Record<string, any>) => renderBlock(child, listPrefix));
          return lines.map((line: string) => `${listPrefix} ${line}`.replace(new RegExp(`^${listPrefix} `), `${listPrefix} `));
        }
        case 'blockquote': {
          const lines = (node.content || []).flatMap((child: Record<string, any>) => renderBlock(child));
          return lines.map((line: string) => `> ${line}`);
        }
        case 'codeBlock': {
          const lang = node.attrs?.language || '';
          const code = renderInline(node.content || []);
          return [`\`\`\`${lang}`, code, '```'];
        }
        case 'horizontalRule': {
          return ['---'];
        }
        default:
          if (node.content) {
            return (node.content || []).flatMap((child: Record<string, any>) => renderBlock(child, listPrefix));
          }
          return [];
      }
    };

    const lines = (content || []).flatMap((node: Record<string, any>) => renderBlock(node));
    return lines.join('\n\n').trim();
  }, [editor]);

  const handleExport = useCallback((format: 'md' | 'pdf') => {
    setShowExportMenu(false);

    if (!editor) return;

    const exportTitle = (title || 'document').trim() || 'document';
    const safeTitle = exportTitle.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').toLowerCase();

    if (format === 'md') {
      const markdown = buildMarkdown();
      const blob = new Blob([markdown || ''], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${safeTitle}.md`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${exportTitle}</title>
    <style>
      @page {
        size: A4;
        margin: 20mm 15mm 20mm 15mm;
      }
      @media print {
        html, body {
          background: #ffffff !important;
          color: #111827 !important;
        }
        h1, h2, h3, h4 {
          page-break-after: avoid;
          break-after: avoid;
        }
        pre, blockquote, img, table, tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
      body {
        font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
        line-height: 1.7;
        color: #111827;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      h1 { font-size: 2.25em; font-weight: 700; margin-top: 1em; margin-bottom: 0.5em; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.3em; }
      h2 { font-size: 1.75em; font-weight: 600; margin-top: 1.2em; margin-bottom: 0.4em; color: #1f2937; }
      h3 { font-size: 1.375em; font-weight: 600; margin-top: 1em; margin-bottom: 0.4em; color: #374151; }
      p { margin-bottom: 1em; }
      ul, ol { padding-left: 24px; margin: 0.75em 0; }
      li { margin-bottom: 0.25em; }
      a { color: #2563eb; text-decoration: underline; }
      blockquote { border-left: 4px solid #d1d5db; padding-left: 16px; margin: 1em 0; color: #6b7280; font-style: italic; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
      pre { background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; }
      hr { border: none; border-top: 2px solid #e5e7eb; margin: 2em 0; }
    </style>
  </head>
  <body>
    ${editor.getHTML()}
  </body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [buildMarkdown, editor, title]);

  // ---- Keyboard shortcuts ----

  useKeyboardShortcuts(
    {
      onSave: flushSave,
      onFind: () => setIsFindBarOpen((prev) => !prev),
      onExportMd: () => handleExport('md'),
      onExportPdf: () => handleExport('pdf'),
      onShowShortcuts: () => setIsShortcutsModalOpen((prev) => !prev),
      onClosePanel: () => {
        if (isFindBarOpen) {
          setIsFindBarOpen(false);
        } else if (activePanel !== 'none') {
          togglePanel(activePanel as 'versions' | 'comments');
        }
      },
    },
    true,
  );

  // ---- Title editing ----

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if (!id || !document) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === document.title) {
      setTitle(document.title);
      return;
    }
    try {
      const updated = await renameDocument(id, trimmed);
      setDocument(updated);
      setTitle(updated.title);
    } catch {
      setTitle(document.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setTitle(document?.title || '');
      setIsEditingTitle(false);
    }
  };

  // ---- Render states ----

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full inline-block mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Unable to load document</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{loadError}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {isEditingTitle && isOwner ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                className="text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-blue-500 focus:outline-none px-1 py-0.5 min-w-0 flex-1 max-w-lg"
                maxLength={255}
              />
            ) : (
              <div className="flex items-center gap-2 min-w-0 max-w-xs sm:max-w-md">
                <h1
                  onClick={() => isOwner && setIsEditingTitle(true)}
                  className={`text-lg font-semibold text-gray-900 dark:text-gray-100 truncate px-1 py-0.5 min-w-0 ${
                    isOwner ? 'cursor-pointer hover:text-blue-700 dark:hover:text-blue-400' : ''
                  }`}
                  title={isOwner ? 'Click to rename' : undefined}
                >
                  {title}
                </h1>
                {!isOwner && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shrink-0 capitalize select-none">
                    {canEdit ? (
                      <Lock className="h-3 w-3 text-gray-400 dark:text-gray-500 shrink-0" />
                    ) : (
                      <Eye className="h-3 w-3 text-gray-400 dark:text-gray-500 shrink-0" />
                    )}
                    {userRole}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Presence Avatars + Panel Buttons + Share + Save Status */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-3 sm:ml-4">
            <PresenceAvatars users={activeUsers} typingUsers={typingUsers} currentUserId={user?._id} currentUser={user} document={document} />
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />

            {/* Save Version Button */}
            {canEdit && (
              <button
                onClick={handleSaveVersion}
                disabled={isSavingVersion}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Save version snapshot"
              >
                {isSavingVersion ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {/* Import Markdown */}
            {canEdit && (
              <ImportMarkdownButton
                editor={editor}
                disabled={!canEdit || isPreviewingVersion}
              />
            )}

            <div className="relative">
              <button
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="inline-flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Download as Markdown or PDF"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-30">
                  <button
                    onClick={() => handleExport('md')}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Download .md
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Download PDF
                  </button>
                </div>
              )}
            </div>

            {/* Version History Button */}
            <button
              onClick={() => togglePanel('versions')}
              className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activePanel === 'versions'
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Version history"
            >
              <History className="h-3.5 w-3.5" />
            </button>

            {/* Comments Button */}
            <button
              onClick={() => togglePanel('comments')}
              className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activePanel === 'comments'
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Comments"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>

            {/* Find in Document Button */}
            <button
              onClick={() => setIsFindBarOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isFindBarOpen
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Find in document (Ctrl+F)"
            >
              <Search className="h-3.5 w-3.5" />
            </button>

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={() => setIsShortcutsModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Keyboard shortcuts (Ctrl+/)"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            {canEdit && <SaveIndicator status={saveStatus} onRetry={retrySave} />}
          </div>
        </div>
      </header>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        document={document}
        onDocumentUpdate={(updated) => {
          setDocument(updated);
          setTitle(updated.title);
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Toolbar */}
      <EditorToolbar
        editor={editor}
        disabled={!canEdit}
        onToggleFind={() => setIsFindBarOpen((prev) => !prev)}
        isFindActive={isFindBarOpen}
      />

      {/* Main content area with optional side panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Find & Replace Bar */}
        <FindReplaceBar
          editor={editor}
          isOpen={isFindBarOpen}
          onClose={() => setIsFindBarOpen(false)}
        />

        {/* Editor Content Container (Paper style) */}
        <div className="flex-1 overflow-y-auto">
          {/* Version preview banner */}
          {isPreviewingVersion && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <Eye className="h-4 w-4" />
              <span className="font-medium">Previewing a previous version</span>
              <span className="text-amber-600 dark:text-amber-400">— The editor is read-only</span>
            </div>
          )}
          <div className="max-w-4xl w-full mx-auto py-12 px-4 sm:px-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm rounded min-h-[800px] dark:text-gray-100">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* Version History Panel */}
        {id && (
          <VersionHistoryPanel
            documentId={id}
            isOpen={activePanel === 'versions'}
            onClose={() => togglePanel('versions')}
            canRestore={canEdit}
            onPreviewVersion={handlePreviewVersion}
            onClearPreview={handleClearPreview}
            onRestore={handleRestoreVersion}
          />
        )}

        {/* Comments Panel */}
        {id && (
          <CommentsPanel
            documentId={id}
            isOpen={activePanel === 'comments'}
            onClose={() => togglePanel('comments')}
            userRole={userRole}
            currentUserId={currentUserId || ''}
            isDocumentOwner={isOwner}
          />
        )}
      </div>
    </div>
  );
};

/** Save status indicator with fixed width slot to prevent header layout shifts. */
const SaveIndicator = ({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) => {
  const renderContent = () => {
    switch (status) {
      case 'unsaved':
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap animate-in fade-in duration-150">
            <CircleDot className="h-3.5 w-3.5 shrink-0" />
            Unsaved
          </span>
        );
      case 'saving':
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-blue-500 dark:text-blue-400 whitespace-nowrap animate-in fade-in duration-150">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            Saving...
          </span>
        );
      case 'saved':
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap animate-in fade-in duration-150">
            <Check className="h-3.5 w-3.5 shrink-0" />
            Saved
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400 whitespace-nowrap animate-in fade-in duration-150">
            <CloudOff className="h-3.5 w-3.5 shrink-0" />
            <button
              onClick={onRetry}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
              title="Retry save"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </span>
        );
      default:
        return (
          <span
            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap animate-in fade-in duration-150"
            title="All changes saved to cloud"
          >
            <Cloud className="h-3.5 w-3.5 shrink-0" />
          </span>
        );
    }
  };

  return (
    <div className="w-16 min-w-[64px] flex items-center justify-end shrink-0 select-none overflow-hidden">
      {renderContent()}
    </div>
  );
};
