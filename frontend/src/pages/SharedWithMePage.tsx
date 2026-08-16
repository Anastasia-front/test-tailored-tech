import { File, Folder, FolderLock, Users2 } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { SharedWithMeEntry } from '@/types';

const icons = { DATA_ROOM: FolderLock, FOLDER: Folder, FILE: File } as const;

export function SharedWithMePage() {
  const [entries, setEntries] = React.useState<SharedWithMeEntry[] | null>(null);

  React.useEffect(() => {
    api.get<SharedWithMeEntry[]>('/shares/mine').then(setEntries);
  }, []);

  return (
    <div className="min-h-screen bg-muted/20">
      <Header />
      <main className="max-w-6xl px-4 py-8 mx-auto">
        <h1 className="mb-1 text-2xl font-semibold">Shared with you</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Content other people have explicitly invited you to view.
        </p>

        {entries === null ? (
          <div className="py-16 text-sm text-center text-muted-foreground">Loading...</div>
        ) : entries.length === 0 ? (
          <EmptyState icon={<Users2 className="w-6 h-6" />} title="Nothing shared with you yet" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => {
              const Icon = icons[entry.resourceType];
              const content = (
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader className="flex-row items-center gap-3 space-y-0">
                    <div className="flex items-center justify-center rounded-md h-9 w-9 bg-muted">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm line-clamp-1">{entry.resourceName}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">Viewer</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
              if (entry.resourceType === 'FILE' && entry.fileId) {
                return (
                  <button
                    key={entry.id}
                    className="text-left"
                    onClick={async () => {
                      const { url } = await api.get<{ url: string }>(
                        `/files/${entry.fileId}/view-url`,
                      );
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {content}
                  </button>
                );
              }
              if (entry.entryFolderId) {
                return (
                  <Link
                    key={entry.id}
                    to={`/rooms/${entry.dataRoomId ?? 'x'}/folders/${entry.entryFolderId}`}
                  >
                    {content}
                  </Link>
                );
              }
              return <div key={entry.id}>{content}</div>;
            })}
          </div>
        )}
      </main>
    </div>
  );
}
