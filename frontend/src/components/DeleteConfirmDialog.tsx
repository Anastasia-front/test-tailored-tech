import { AlertTriangle } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatBytes } from '@/lib/utils';

interface Preview {
  folderCount?: number;
  fileCount: number;
  totalSizeBytes: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  itemLabel,
  loadPreview,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemLabel: string;
  loadPreview: () => Promise<Preview>;
  onConfirm: () => Promise<void>;
}) {
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setPreview(null);
      return;
    }
    setLoading(true);
    loadPreview()
      .then(setPreview)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="mt-2">{title}</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-muted/60 p-3 text-sm">
          {loading ? (
            'Calculating what will be deleted...'
          ) : preview ? (
            <>
              Deleting {itemLabel} will permanently remove{' '}
              {preview.folderCount !== undefined && (
                <>
                  <strong>{preview.folderCount}</strong> folder
                  {preview.folderCount === 1 ? '' : 's'} and{' '}
                </>
              )}
              <strong>{preview.fileCount}</strong> file{preview.fileCount === 1 ? '' : 's'} (
              {formatBytes(preview.totalSizeBytes)}).
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting || loading}>
            {deleting ? 'Deleting...' : 'Delete permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
