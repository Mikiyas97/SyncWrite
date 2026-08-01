import { ReactNode } from 'react';
import { DocumentCard } from './DocumentCard';
import type { Document } from '../../types/document';

interface DocumentSectionProps {
  title: string;
  icon: ReactNode;
  documents: Document[];
  currentUserId: string;
  emptyMessage?: string;
  onRename: (id: string, currentTitle: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const DocumentSection = ({
  title,
  icon,
  documents,
  currentUserId,
  emptyMessage = 'No documents found.',
  onRename,
  onDuplicate,
  onDelete,
}: DocumentSectionProps) => {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2.5 mb-4">
        {icon}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-400 font-medium">({documents.length})</span>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc._id}
              document={doc}
              currentUserId={currentUserId}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
};
