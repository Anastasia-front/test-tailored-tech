import { ChevronRight, Folder as FolderIcon, FolderLock } from 'lucide-react';
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
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { FolderContents } from '@/types';

export function MoveFileDialog({
  open,
  onOpenChange,
  rootFolderId,
  currentFolderId,
  fileName,
  onMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rootFolderId: string;
  currentFolderId: string;
  fileName: string;
  onMove: (targetFolderId: string) => Promise<void>;
}) {
  const [browsingId, setBrowsingId] = React.useState(rootFolderId);
  const [contents, setContents] = React.useState<FolderContents | null>(null);
  const [moving, setMoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setBrowsingId(rootFolderId);
      setError(null);
    }
  }, [open, rootFolderId]);

  React.useEffect(() => {
    if (!open) return;
    api.get<FolderContents>(`/folders/${browsingId}`).then(setContents);
  }, [open, browsingId]);

  const submit = async () => {
    setMoving(true);
    setError(null);
    try {
      await onMove(browsingId);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message ?? 'Move failed');
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move &ldquo;{fileName}&rdquo;</DialogTitle>
          <DialogDescription>Pick a destination folder.</DialogDescription>
        </DialogHeader>

        {contents && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {contents.breadcrumb.map((b, i) => (
              <span key={b.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <button onClick={() => setBrowsingId(b.id)} className="hover:text-foreground">
                  {b.name}
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="max-h-64 overflow-y-auto rounded-md border">
          {contents?.subfolders.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">No subfolders here.</p>
          )}
          {contents?.subfolders.map((f) => (
            <button
              key={f.id}
              onClick={() => setBrowsingId(f.id)}
              className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
            >
              {f.isRoot ? (
                <FolderLock className="h-4 w-4 text-primary" />
              ) : (
                <FolderIcon className="h-4 w-4 text-primary" />
              )}
              {f.name}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={moving || browsingId === currentFolderId}
            className={cn(browsingId === currentFolderId && 'opacity-50')}
          >
            {moving ? 'Moving...' : browsingId === currentFolderId ? 'Already here' : `Move here`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
