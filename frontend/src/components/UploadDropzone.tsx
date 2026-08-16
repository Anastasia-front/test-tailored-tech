import { AlertCircle, CheckCircle2, File as FileIcon, UploadCloud, X } from 'lucide-react';
import * as React from 'react';

import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { cn, formatBytes } from '@/lib/utils';
import type { FileNode } from '@/types';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

export function UploadDropzone({
  folderId,
  onUploaded,
}: {
  folderId: string;
  onUploaded: (file: FileNode) => void;
}) {
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const uploadOne = async (file: File) => {
    const id = `${file.name}-${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, file, progress: 0, status: 'uploading' }]);

    try {
      const { uploadUrl, key, resolvedName } = await api.post<{
        uploadUrl: string;
        key: string;
        resolvedName: string;
      }>('/files/upload-url', {
        folderId,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setItems((prev) => prev.map((it) => (it.id === id ? { ...it, progress: pct } : it)));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed'));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      const created = await api.post<FileNode>('/files/confirm', {
        folderId,
        key,
        name: resolvedName,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
      });

      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: 'done', progress: 100 } : it)),
      );
      onUploaded(created);
      setTimeout(() => setItems((prev) => prev.filter((it) => it.id !== id)), 2500);
    } catch (err: any) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, status: 'error', error: err.message ?? 'Upload failed' } : it,
        ),
      );
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    Array.from(fileList).forEach((f) => uploadOne(f));
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        )}
      >
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">Drag and drop files here, or click to browse</p>
        <p className="text-xs text-muted-foreground">Any file type is accepted</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {items.length > 0 && (
        <div className="mt-3 grid gap-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-md border p-2.5">
              <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm">{it.file.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBytes(it.file.size)}
                  </span>
                </div>
                {it.status === 'uploading' && (
                  <Progress value={it.progress} className="mt-1.5 h-1" />
                )}
                {it.status === 'error' && (
                  <p className="mt-1 text-xs text-destructive">{it.error}</p>
                )}
              </div>
              {it.status === 'done' && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              )}
              {it.status === 'error' && (
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              {it.status !== 'uploading' && (
                <button onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
