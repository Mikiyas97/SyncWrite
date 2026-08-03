import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const searchHighlightKey = new PluginKey('searchHighlight');

export interface SearchHighlightState {
  searchTerm: string;
  matchCount: number;
  currentMatch: number;
  matchPositions: Array<{ from: number; to: number }>;
}

/**
 * TipTap extension that highlights all occurrences of a search term in the document
 * using ProseMirror decorations via Plugin transaction metadata.
 */
export const SearchHighlightExtension = Extension.create({
  name: 'searchHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchHighlightState>({
        key: searchHighlightKey,
        state: {
          init(): SearchHighlightState {
            return { searchTerm: '', matchCount: 0, currentMatch: 0, matchPositions: [] };
          },
          apply(tr, oldState, _prevEditorState, newState): SearchHighlightState {
            const meta = tr.getMeta(searchHighlightKey);

            let searchTerm = oldState.searchTerm;
            let currentMatch = oldState.currentMatch;

            if (meta) {
              if (typeof meta.searchTerm === 'string') searchTerm = meta.searchTerm;
              if (typeof meta.currentMatch === 'number') currentMatch = meta.currentMatch;
            }

            if (!searchTerm || searchTerm.trim().length === 0) {
              return { searchTerm: '', matchCount: 0, currentMatch: 0, matchPositions: [] };
            }

            const matchPositions: Array<{ from: number; to: number }> = [];
            const lowerSearch = searchTerm.toLowerCase();

            newState.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              const text = node.text.toLowerCase();
              let index = text.indexOf(lowerSearch);
              while (index !== -1) {
                matchPositions.push({
                  from: pos + index,
                  to: pos + index + searchTerm.length,
                });
                index = text.indexOf(lowerSearch, index + 1);
              }
            });

            const validCurrent = matchPositions.length > 0
              ? Math.min(Math.max(0, currentMatch), matchPositions.length - 1)
              : 0;

            return {
              searchTerm,
              matchCount: matchPositions.length,
              currentMatch: validCurrent,
              matchPositions,
            };
          },
        },
        props: {
          decorations(state) {
            const pluginState = searchHighlightKey.getState(state) as SearchHighlightState;
            if (!pluginState || pluginState.matchPositions.length === 0) {
              return DecorationSet.empty;
            }

            const decorations = pluginState.matchPositions.map((match, i) =>
              Decoration.inline(match.from, match.to, {
                class: i === pluginState.currentMatch ? 'search-match-current' : 'search-match',
              }),
            );

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
