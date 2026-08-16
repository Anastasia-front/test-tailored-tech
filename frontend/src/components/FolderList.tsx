import {
  ExternalLink,
  FileText,
  Folder as FolderIcon,
  FolderInput,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
} from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatBytes, formatDate } from '@/lib/utils';
import type { FileNode, FolderNode } from '@/types';

interface Actions {
  onOpenFile: (file: FileNode) => void;
  onRenameFolder: (folder: FolderNode) => void;
  onDeleteFolder: (folder: FolderNode) => void;
  onShareFolder: (folder: FolderNode) => void;
  onRenameFile: (file: FileNode) => void;
  onMoveFile: (file: FileNode) => void;
  onDeleteFile: (file: FileNode) => void;
  onShareFile: (file: FileNode) => void;
  readOnly: boolean;
  roomId: string;
}

export function FolderList({
  subfolders,
  files,
  actions,
}: {
  subfolders: FolderNode[];
  files: FileNode[];
  actions: Actions;
}) {
  if (subfolders.length === 0 && files.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Size</th>
            <th className="px-4 py-2 font-medium">Updated</th>
            <th className="w-10 px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {subfolders.map((folder) => (
            <tr key={folder.id} className="border-t hover:bg-accent/40">
              <td className="px-4 py-2.5">
                <Link
                  to={`/rooms/${actions.roomId}/folders/${folder.id}`}
                  className="flex items-center gap-2 font-medium"
                >
                  <FolderIcon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{folder.name}</span>
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {folder.totalItemCount} item{folder.totalItemCount === 1 ? '' : 's'} &middot;{' '}
                {formatBytes(folder.totalSizeBytes)}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {formatDate(folder.updatedAt)}
              </td>
              <td className="px-4 py-2.5 text-right">
                {!actions.readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                        aria-label="Folder actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => actions.onShareFolder(folder)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actions.onRenameFolder(folder)}>
                        <Pencil className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => actions.onDeleteFolder(folder)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </td>
            </tr>
          ))}
          {files.map((file) => (
            <tr key={file.id} className="border-t hover:bg-accent/40">
              <td className="px-4 py-2.5">
                <button
                  onClick={() => actions.onOpenFile(file)}
                  className="flex items-center gap-2 truncate text-left font-medium"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                </button>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatBytes(file.sizeBytes)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatDate(file.updatedAt)}</td>
              <td className="px-4 py-2.5 text-right">
                {!actions.readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                        aria-label="File actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => actions.onShareFile(file)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actions.onRenameFile(file)}>
                        <Pencil className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actions.onMoveFile(file)}>
                        <FolderInput className="mr-2 h-4 w-4" /> Move
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => actions.onDeleteFile(file)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
