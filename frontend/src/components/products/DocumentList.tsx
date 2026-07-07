import { useState } from 'react';
import { FileText, Image, Trash2, ExternalLink } from 'lucide-react';
import { ProductDocument } from '../../types';
import { formatDate } from '../../utils';
import Button from '../ui/Button';

interface DocumentListProps {
  documents: ProductDocument[];
  onDelete?: (docId: string) => void;
}

export default function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-slate-500">No documents uploaded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <DocumentItem key={doc._id} doc={doc} onDelete={onDelete} />
      ))}
    </div>
  );
}

function DocumentItem({ doc, onDelete }: { doc: ProductDocument; onDelete?: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const isPdf = doc.mimeType === 'application/pdf';

  const handleDelete = async () => {
    if (!onDelete || !confirm('Delete this document?')) return;
    setDeleting(true);
    try {
      await onDelete(doc._id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-border p-3 hover:bg-slate-50 transition-colors">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {isPdf ? <FileText className="h-5 w-5" /> : <Image className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{doc.fileName}</p>
        <p className="text-xs text-slate-400 capitalize">{doc.type.replace('_', ' ')} · {formatDate(doc.uploadedAt)}</p>
      </div>
      <div className="flex items-center gap-1">
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={handleDelete} loading={deleting} className="!p-2 text-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
