import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import LinkExtension from '@tiptap/extension-link';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { getDocument, updateDocumentContent, renameDocument } from '../services/documentService';
import type { Document } from '../types/document';
import { ArrowLeft, Cloud, CloudOff, Loader2, AlertCircle, Check } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  const contentInitializedRef = useRef(false);

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

      // Debounced auto-save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      setSaveStatus('saving');
      saveTimerRef.current = setTimeout(() => {
        saveContent(updatedEditor.getJSON());
      }, 1500);
    },
  });

  // Fetch document on mount
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

  // Set editor content once document is loaded and editor is ready
  useEffect(() => {
    if (editor && document && !contentInitializedRef.current) {
      const content = document.content;
      if (content && typeof content === 'object' && content.type === 'doc') {
        editor.commands.setContent(content);
      }
      contentInitializedRef.current = true;
    }
  }, [editor, document]);

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const saveContent = useCallback(
    async (content: Record<string, any>) => {
      if (!id) return;
      try {
        setSaveStatus('saving');
        await updateDocumentContent(id, content);
        setSaveStatus('saved');
        // Reset to idle after 2s
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    },
    [id]
  );

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

  // --- Render states ---

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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => navigate('/dashboard')}
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
            <SaveIndicator status={saveStatus} />
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

/** Small component showing save status with icon + text. */
const SaveIndicator = ({ status }: { status: SaveStatus }) => {
  switch (status) {
    case 'saving':
      return (
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
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
        <span className="flex items-center gap-1.5 text-xs text-red-500">
          <CloudOff className="h-3.5 w-3.5" />
          Save failed
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
