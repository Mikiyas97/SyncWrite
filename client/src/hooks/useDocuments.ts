import { useState, useEffect, useCallback, useRef } from 'react';
import * as documentService from '../services/documentService';
import type { Document, DocumentListResponse } from '../types/document';

interface UseDocumentsReturn {
  documents: DocumentListResponse | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  createDocument: (title?: string) => Promise<Document>;
  renameDocument: (id: string, title: string) => Promise<void>;
  duplicateDocument: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  toggleFavoriteDocument: (id: string) => Promise<void>;
  togglePinDocument: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useDocuments = (): UseDocumentsReturn => {
  const [documents, setDocuments] = useState<DocumentListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isFirstRender = useRef(true);

  const fetchDocuments = useCallback(async (search?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await documentService.listDocuments(search);
      setDocuments(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Debounced search
  useEffect(() => {
    // Skip the debounce effect on the very first render since the initial load handles it
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceRef.current !== undefined) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchDocuments(searchQuery);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, fetchDocuments]);

  const createDoc = useCallback(async (title?: string) => {
    const createdDocument = await documentService.createDocument(title);
    await fetchDocuments(searchQuery);
    return createdDocument;
  }, [fetchDocuments, searchQuery]);

  const renameDoc = useCallback(async (id: string, title: string) => {
    await documentService.renameDocument(id, title);
    await fetchDocuments(searchQuery);
  }, [fetchDocuments, searchQuery]);

  const duplicateDoc = useCallback(async (id: string) => {
    await documentService.duplicateDocument(id);
    await fetchDocuments(searchQuery);
  }, [fetchDocuments, searchQuery]);

  const deleteDoc = useCallback(async (id: string) => {
    await documentService.deleteDocument(id);
    await fetchDocuments(searchQuery);
  }, [fetchDocuments, searchQuery]);

  const toggleFavorite = useCallback(async (id: string) => {
    await documentService.toggleFavoriteDocument(id);
    await fetchDocuments(searchQuery);
  }, [fetchDocuments, searchQuery]);

  const togglePin = useCallback(async (id: string) => {
    await documentService.togglePinDocument(id);
    await fetchDocuments(searchQuery);
  }, [fetchDocuments, searchQuery]);

  return {
    documents,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    createDocument: createDoc,
    renameDocument: renameDoc,
    duplicateDocument: duplicateDoc,
    deleteDocument: deleteDoc,
    toggleFavoriteDocument: toggleFavorite,
    togglePinDocument: togglePin,
    refresh: () => fetchDocuments(searchQuery),
  };
};
