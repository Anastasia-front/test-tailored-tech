import { FolderPlus, PackageOpen, Upload as UploadIcon } from 'lucide-react';
import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CreateFolderDialog } from '@/components/CreateFolderDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { FolderList } from '@/components/FolderList';
import { Header } from '@/components/Header';
import { MoveFileDialog } from '@/components/MoveFileDialog';
import { RenameDialog } from '@/components/RenameDialog';
import { ShareDialog } from '@/components/ShareDialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-context';
import { UploadDropzone } from '@/components/UploadDropzone';
import { useAuth } from '@/context/auth-context';
import { api, ApiError } from '@/lib/api';
import type { FileNode, FolderContents, FolderNode } from '@/types';

export function FolderPage() {
  const { roomId, folderId } = useParams<{ roomId: string; folderId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [contents, setContents] = React.useState<FolderContents | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [createFolderOpen, setCreateFolderOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const [renameFolder, setRenameFolder] = React.useState<FolderNode | null>(null);
  const [deleteFolder, setDeleteFolder] = React.useState<FolderNode | null>(null);
  const [shareFolder, setShareFolder] = React.useState<FolderNode | null>(null);

  const [renameFile, setRenameFile] = React.useState<FileNode | null>(null);
  const [moveFile, setMoveFile] = React.useState<FileNode | null>(null);
  const [deleteFile, setDeleteFile] = React.useState<FileNode | null>(null);
  const [shareFile, setShareFile] = React.useState<FileNode | null>(null);

  const load = React.useCallback(async () => {
    if (!folderId) return;
    try {
      const data = await api.get<FolderContents>(`/folders/${folderId}`);
      setContents(data);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      }
    }
  }, [folderId]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-muted/20">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-16">
          <EmptyState
            icon={<PackageOpen className="h-6 w-6" />}
            title="This content no longer exists"
            description="The folder you were viewing was deleted, or your access to it was revoked."
            action={
              <Button size="sm" onClick={() => navigate('/')}>
                Back to data rooms
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  if (!contents || !roomId) {
    return (
      <div className="min-h-screen bg-muted/20">
        <Header />
        <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const readOnly = !user || contents.dataRoom?.ownerId !== user.id;

  const openFile = async (file: FileNode) => {
    try {
      const { url } = await api.get<{ url: string }>(`/files/${file.id}/view-url`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast({ title: 'Could not open file', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Breadcrumbs roomId={roomId} items={contents.breadcrumb} />

        <div className="mt-3 mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            {contents.folder.isRoot ? contents.dataRoom?.name : contents.folder.name}
          </h1>
          {!readOnly && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
                <FolderPlus className="mr-1.5 h-4 w-4" /> New folder
              </Button>
              <Button size="sm" onClick={() => setUploadOpen((v) => !v)}>
                <UploadIcon className="mr-1.5 h-4 w-4" /> Upload
              </Button>
            </div>
          )}
        </div>

        {!readOnly && uploadOpen && (
          <div className="mb-6">
            <UploadDropzone
              folderId={contents.folder.id}
              onUploaded={(file) =>
                setContents((prev) => (prev ? { ...prev, files: [...prev.files, file] } : prev))
              }
            />
          </div>
        )}

        {contents.subfolders.length === 0 && contents.files.length === 0 ? (
          <EmptyState
            icon={<PackageOpen className="h-6 w-6" />}
            title="This folder is empty"
            description={
              readOnly
                ? 'Nothing has been shared here yet.'
                : 'Upload files or create a subfolder to get started.'
            }
          />
        ) : (
          <FolderList
            subfolders={contents.subfolders}
            files={contents.files}
            actions={{
              readOnly,
              roomId,
              onOpenFile: openFile,
              onRenameFolder: setRenameFolder,
              onDeleteFolder: setDeleteFolder,
              onShareFolder: setShareFolder,
              onRenameFile: setRenameFile,
              onMoveFile: setMoveFile,
              onDeleteFile: setDeleteFile,
              onShareFile: setShareFile,
            }}
          />
        )}
      </main>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onCreate={async (name) => {
          const folder = await api.post<FolderNode>('/folders', {
            name,
            parentId: contents.folder.id,
          });
          setContents((prev) =>
            prev ? { ...prev, subfolders: [...prev.subfolders, folder] } : prev,
          );
        }}
      />

      {renameFolder && (
        <RenameDialog
          open={!!renameFolder}
          onOpenChange={(open) => !open && setRenameFolder(null)}
          initialName={renameFolder.name}
          onRename={async (name) => {
            const updated = await api.patch<FolderNode>(`/folders/${renameFolder.id}`, { name });
            setContents((prev) =>
              prev
                ? {
                    ...prev,
                    subfolders: prev.subfolders.map((f) => (f.id === updated.id ? updated : f)),
                  }
                : prev,
            );
          }}
        />
      )}

      {deleteFolder && (
        <DeleteConfirmDialog
          open={!!deleteFolder}
          onOpenChange={(open) => !open && setDeleteFolder(null)}
          title={`Delete "${deleteFolder.name}"?`}
          itemLabel="this folder"
          loadPreview={() => api.get(`/folders/${deleteFolder.id}/delete-preview`)}
          onConfirm={async () => {
            await api.delete(`/folders/${deleteFolder.id}`);
            setContents((prev) =>
              prev
                ? { ...prev, subfolders: prev.subfolders.filter((f) => f.id !== deleteFolder.id) }
                : prev,
            );
            toast({ title: 'Folder deleted' });
          }}
        />
      )}

      {shareFolder && (
        <ShareDialog
          open={!!shareFolder}
          onOpenChange={(open) => !open && setShareFolder(null)}
          resourceType="FOLDER"
          resourceId={shareFolder.id}
          resourceName={shareFolder.name}
        />
      )}

      {renameFile && (
        <RenameDialog
          open={!!renameFile}
          onOpenChange={(open) => !open && setRenameFile(null)}
          initialName={renameFile.name}
          onRename={async (name) => {
            const updated = await api.patch<FileNode>(`/files/${renameFile.id}`, { name });
            setContents((prev) =>
              prev
                ? { ...prev, files: prev.files.map((f) => (f.id === updated.id ? updated : f)) }
                : prev,
            );
          }}
        />
      )}

      {moveFile && (
        <MoveFileDialog
          open={!!moveFile}
          onOpenChange={(open) => !open && setMoveFile(null)}
          rootFolderId={contents.breadcrumb[0]?.id ?? contents.folder.id}
          currentFolderId={contents.folder.id}
          fileName={moveFile.name}
          onMove={async (targetFolderId) => {
            await api.patch<FileNode>(`/files/${moveFile.id}`, { folderId: targetFolderId });
            setContents((prev) =>
              prev ? { ...prev, files: prev.files.filter((f) => f.id !== moveFile.id) } : prev,
            );
            toast({ title: 'File moved' });
          }}
        />
      )}

      {deleteFile && (
        <DeleteConfirmDialog
          open={!!deleteFile}
          onOpenChange={(open) => !open && setDeleteFile(null)}
          title={`Delete "${deleteFile.name}"?`}
          itemLabel="this file"
          loadPreview={async () => ({ fileCount: 1, totalSizeBytes: deleteFile.sizeBytes })}
          onConfirm={async () => {
            await api.delete(`/files/${deleteFile.id}`);
            setContents((prev) =>
              prev ? { ...prev, files: prev.files.filter((f) => f.id !== deleteFile.id) } : prev,
            );
            toast({ title: 'File deleted' });
          }}
        />
      )}

      {shareFile && (
        <ShareDialog
          open={!!shareFile}
          onOpenChange={(open) => !open && setShareFile(null)}
          resourceType="FILE"
          resourceId={shareFile.id}
          resourceName={shareFile.name}
        />
      )}
    </div>
  );
}
