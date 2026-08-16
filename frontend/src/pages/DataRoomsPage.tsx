import { FolderLock, MoreVertical, Plus, Share2, Trash2, Users2 } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { CreateDataRoomDialog } from '@/components/CreateDataRoomDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { ShareDialog } from '@/components/ShareDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import type { DataRoomSummary } from '@/types';

export function DataRoomsPage() {
  const { toast } = useToast();
  const [owned, setOwned] = React.useState<DataRoomSummary[] | null>(null);
  const [shared, setShared] = React.useState<DataRoomSummary[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [shareTarget, setShareTarget] = React.useState<DataRoomSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DataRoomSummary | null>(null);

  const load = React.useCallback(async () => {
    const data = await api.get<{ owned: DataRoomSummary[]; shared: DataRoomSummary[] }>(
      '/data-rooms',
    );
    setOwned(data.owned);
    setShared(data.shared);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-muted/20">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Data rooms</h1>
            <p className="text-sm text-muted-foreground">
              Secure spaces for due-diligence document sharing.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New data room
          </Button>
        </div>

        {owned === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
        ) : owned.length === 0 ? (
          <EmptyState
            icon={<FolderLock className="h-6 w-6" />}
            title="No data rooms yet"
            description="Create your first data room to start sharing documents securely."
            action={
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> New data room
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {owned.map((room) => (
              <Card key={room.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <Link to={`/rooms/${room.id}/folders/${room.rootFolderId}`} className="flex-1">
                    <CardTitle className="line-clamp-1">{room.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {room.totalItemCount} item{room.totalItemCount === 1 ? '' : 's'} &middot;{' '}
                      {formatBytes(room.totalSizeBytes)}
                    </p>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShareTarget(room)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(room)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {room.description && (
                    <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                      {room.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(room.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {shared.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Users2 className="h-5 w-5" /> Shared with you
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shared.map((room) => (
                <Link key={room.id} to={`/rooms/${room.id}/folders/${room.rootFolderId}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{room.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {room.totalItemCount} item{room.totalItemCount === 1 ? '' : 's'} &middot;{' '}
                        {formatBytes(room.totalSizeBytes)}
                      </p>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <CreateDataRoomDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(room) => setOwned((prev) => [room, ...(prev ?? [])])}
      />

      {shareTarget && (
        <ShareDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          resourceType="DATA_ROOM"
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={`Delete "${deleteTarget.name}"?`}
          itemLabel="this data room"
          loadPreview={() => api.get(`/data-rooms/${deleteTarget.id}/delete-preview`)}
          onConfirm={async () => {
            await api.delete(`/data-rooms/${deleteTarget.id}`);
            setOwned((prev) => prev?.filter((r) => r.id !== deleteTarget.id) ?? null);
            toast({ title: 'Data room deleted' });
          }}
        />
      )}
    </div>
  );
}
