import {
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  FolderLock,
  PackageOpen,
  ShieldAlert,
} from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { api, ApiError } from '@/lib/api';
import { formatBytes, formatDate, formatRelativeTime } from '@/lib/utils';
import type { FileNode, FolderContents } from '@/types';

type PublicRoot =
  ({ resourceType: 'FOLDER' } & FolderContents) | { resourceType: 'FILE'; file: FileNode };

export function PublicSharePage() {
  const { token, folderId } = useParams<{ token: string; folderId?: string }>();
  const navigate = useNavigate();
  const [data, setData] = React.useState<PublicRoot | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    setData(null);
    setError(null);
    const path = folderId ? `/public/${token}/folders/${folderId}` : `/public/${token}`;
    api
      .get<any>(path)
      .then((res) => setData(folderId ? { resourceType: 'FOLDER', ...res } : res))
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : 'This link is invalid or has been revoked.',
        );
      });
  }, [token, folderId]);

  const openFile = async (file: FileNode) => {
    try {
      const { url } = await api.get<{ url: string }>(`/public/${token}/files/${file.id}/view-url`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('This content no longer exists.');
    }
  };

  if (error) {
    return (
      <ShellCenter>
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="Link unavailable"
          description={error}
        />
      </ShellCenter>
    );
  }

  if (!data) {
    return (
      <ShellCenter>
        <div className="text-sm text-muted-foreground">Loading shared content...</div>
      </ShellCenter>
    );
  }

  if (data.resourceType === 'FILE') {
    return (
      <ShellCenter>
        <div className="flex flex-col items-center gap-3 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">{data.file.name}</p>
            <p className="text-sm text-muted-foreground">{formatBytes(data.file.sizeBytes)}</p>
          </div>
          <button
            onClick={() => openFile(data.file)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View file
          </button>
        </div>
      </ShellCenter>
    );
  }

  const contents = data;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 font-semibold">
          <FolderLock className="h-4 w-4 text-primary" /> Shared data room (read-only)
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {contents.breadcrumb.map((b, i) => (
            <span key={b.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {i === contents.breadcrumb.length - 1 ? (
                <span className="font-medium text-foreground">{b.name}</span>
              ) : (
                <button
                  onClick={() => navigate(`/share/${token}/folders/${b.id}`)}
                  className="hover:text-foreground"
                >
                  {b.name}
                </button>
              )}
            </span>
          ))}
        </nav>
        <h1 className="mb-6 text-2xl font-semibold">
          {contents.folder.isRoot ? contents.dataRoom?.name : contents.folder.name}
        </h1>

        {contents.subfolders.length === 0 && contents.files.length === 0 ? (
          <EmptyState icon={<PackageOpen className="h-6 w-6" />} title="This folder is empty" />
        ) : (
          <div className="overflow-hidden rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Size</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {contents.subfolders.map((f) => (
                  <tr key={f.id} className="border-t hover:bg-accent/40">
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/share/${token}/folders/${f.id}`}
                        className="flex items-center gap-2 font-medium"
                      >
                        <FolderIcon className="h-4 w-4 text-primary" /> {f.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatBytes(f.totalSizeBytes)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-muted-foreground"
                      title={formatDate(f.updatedAt)}
                    >
                      {formatRelativeTime(f.updatedAt)}
                    </td>
                  </tr>
                ))}
                {contents.files.map((f) => (
                  <tr key={f.id} className="border-t hover:bg-accent/40">
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => openFile(f)}
                        className="flex items-center gap-2 font-medium"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" /> {f.name}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatBytes(f.sizeBytes)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-muted-foreground"
                      title={formatDate(f.updatedAt)}
                    >
                      {formatRelativeTime(f.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function ShellCenter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
