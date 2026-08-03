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
 * using ProseMirror decorations. Supports navigating between matches.
 */
export const SearchHighlightExtension = Extension.create({
  name: 'searchHighlight',

  addOptions() {
    return {
      searchTerm: '',
      currentMatch: 0,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: searchHighlightKey,
        state: {
          init(): SearchHighlightState {
            return { searchTerm: '', matchCount: 0, currentMatch: 0, matchPositions: [] };
          },
          apply(_tr, _oldState, _prevEditorState, newState): SearchHighlightState {
            const searchTerm = extension.options.searchTerm as string;
            const currentMatch = extension.options.currentMatch as number;

            if (!searchTerm || searchTerm.length === 0) {
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

            return {
              searchTerm,
              matchCount: matchPositions.length,
              currentMatch: matchPositions.length > 0 ? Math.min(currentMatch, matchPositions.length - 1) : 0,
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
