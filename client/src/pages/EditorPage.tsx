import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import LinkExtension from '@tiptap/extension-link';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { getDocument, updateDocumentContent, renameDocument } from '../services/documentService';
import { useSocket, useDocumentSocket } from '../hooks/useSocket';
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
} from 'lucide-react';

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 2000;
const SAVED_DISPLAY_MS = 3000;

export const EditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [title, setTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentInitializedRef = useRef(false);
  const pendingContentRef = useRef<Record<string, any> | null>(null);
  const isSavingRef = useRef(false);
  const isRemoteUpdateRef = useRef(false);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  // ---- Socket.IO ----

  const { isConnected } = useSocket();

  const handleRemoteContent = useCallback((content: Record<string, any>, _userId: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    // Set flag so onUpdate knows this is a remote change (don't re-broadcast or save)
    isRemoteUpdateRef.current = true;
    ed.commands.setContent(content, false);
    isRemoteUpdateRef.current = false;
  }, []);

  const { isJoined, emitContentChange } = useDocumentSocket(
    isConnected ? id : undefined,
    handleRemoteContent,
  );

  const emitContentChangeRef = useRef(emitContentChange);
  useEffect(() => {
    emitContentChangeRef.current = emitContentChange;
  }, [emitContentChange]);

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
  });

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
    };
  }, []);

  // ---- Navigate back (flush first) ----

  const handleBack = useCallback(async () => {
    await flushSave();
    navigate('/dashboard');
  }, [flushSave, navigate]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 p-4 rounded-full inline-block mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to load document</h2>
          <p className="text-sm text-gray-500 mb-6">{loadError}</p>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                className="text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none px-1 py-0.5 min-w-0 flex-1 max-w-lg"
                maxLength={255}
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-lg font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-700 transition-colors px-1 py-0.5 max-w-lg"
                title="Click to rename"
              >
                {title}
              </h1>
            )}
          </div>

          {/* Right: Save Status */}
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <SaveIndicator status={saveStatus} onRetry={retrySave} />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor Content Container (Paper style) */}
      <div className="flex-1 max-w-4xl w-full mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white border border-gray-300 shadow-sm rounded min-h-[800px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

/** Save status indicator with distinct states. */
const SaveIndicator = ({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) => {
  switch (status) {
    case 'unsaved':
      return (
        <span className="flex items-center gap-1.5 text-xs text-amber-600">
          <CircleDot className="h-3.5 w-3.5" />
          Unsaved changes
        </span>
      );
    case 'saving':
      return (
        <span className="flex items-center gap-1.5 text-xs text-blue-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving...
        </span>
      );
    case 'saved':
      return (
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <Check className="h-3.5 w-3.5" />
          Saved
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-2 text-xs text-red-500">
          <CloudOff className="h-3.5 w-3.5" />
          Save failed
          <button
            onClick={onRetry}
            className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
            title="Retry save"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <Cloud className="h-3.5 w-3.5" />
        </span>
      );
  }
};
