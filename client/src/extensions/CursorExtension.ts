import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { RemoteCursor } from '../api/socket';

export const cursorPluginKey = new PluginKey('remoteCursors');

export interface RemoteCursorMeta {
  cursors: Map<string, RemoteCursor>;
  currentUserId?: string;
}

interface PluginState {
  cursors: Map<string, RemoteCursor>;
  currentUserId?: string;
  decoSet: DecorationSet;
}

/**
 * TipTap extension that renders colored remote cursor markers and selection highlights
 * for each collaborator currently viewing the document.
 */
export const RemoteCursorExtension = Extension.create({
  name: 'remoteCursors',

  addProseMirrorPlugins() {
    return [
      new Plugin<PluginState>({
        key: cursorPluginKey,
        state: {
          init() {
            return {
              cursors: new Map<string, RemoteCursor>(),
              decoSet: DecorationSet.empty,
            };
          },
          apply(tr, oldPluginState, _oldEditorState, newEditorState) {
            const meta = tr.getMeta('updateRemoteCursors') as RemoteCursorMeta | Map<string, RemoteCursor> | undefined;

            let updatedCursors: Map<string, RemoteCursor> | undefined;
            let currentUserId = oldPluginState.currentUserId;

            if (meta) {
              if (meta instanceof Map) {
                updatedCursors = meta;
              } else {
                updatedCursors = meta.cursors;
                currentUserId = meta.currentUserId || currentUserId;
              }
            }

            const cursors = updatedCursors !== undefined ? updatedCursors : oldPluginState.cursors;
            const docChanged = tr.docChanged;

            if (updatedCursors === undefined && !docChanged && oldPluginState.decoSet) {
              return { cursors, currentUserId, decoSet: oldPluginState.decoSet };
            }

            const decorations: Decoration[] = [];
            const docSize = newEditorState.doc.content.size;
            const minPos = 1;
            const maxPos = Math.max(1, docSize - 1);

            for (const [userId, cursor] of cursors) {
              if (!cursor.cursor) continue;
              // Do not render remote cursor marker for the user's own userId
              if (currentUserId && (userId === currentUserId || cursor.userId === currentUserId)) continue;

              const { from, to } = cursor.cursor;

              const clampedFrom = Math.min(Math.max(from, minPos), maxPos);
              const clampedTo = Math.min(Math.max(to, minPos), maxPos);

              // Selection highlight
              if (clampedFrom !== clampedTo) {
                const selFrom = Math.min(clampedFrom, clampedTo);
                const selTo = Math.max(clampedFrom, clampedTo);
                decorations.push(
                  Decoration.inline(selFrom, selTo, {
                    class: 'remote-selection',
                    style: `background-color: ${cursor.color}30;`,
                  }),
                );
              }

              // Cursor line widget
              const cursorWidget = document.createElement('span');
              cursorWidget.className = 'remote-cursor';
              cursorWidget.style.borderLeftColor = cursor.color;

              // Name label
              const label = document.createElement('span');
              label.className = 'remote-cursor-label';
              label.style.backgroundColor = cursor.color;
              label.textContent = cursor.userName;
              cursorWidget.appendChild(label);

              decorations.push(
                Decoration.widget(clampedFrom, cursorWidget, {
                  side: -1,
                  key: `cursor-${cursor.userId}-${clampedFrom}`,
                }),
              );
            }

            return {
              cursors,
              currentUserId,
              decoSet: DecorationSet.create(newEditorState.doc, decorations),
            };
          },
        },
        props: {
          decorations(state) {
            return cursorPluginKey.getState(state)?.decoSet || DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
