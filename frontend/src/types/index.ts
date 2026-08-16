export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface DataRoomSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  rootFolderId?: string;
  totalSizeBytes: string;
  totalItemCount: number;
  isOwner: boolean;
  shareId?: string;
}

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  dataRoomId: string;
  isRoot: boolean;
  createdAt: string;
  updatedAt: string;
  totalSizeBytes: string;
  totalItemCount: number;
  type: 'folder';
}

export interface FileNode {
  id: string;
  name: string;
  sizeBytes: string;
  mimeType: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
  type: 'file';
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  isRoot: boolean;
}

export interface FolderContents {
  folder: FolderNode;
  dataRoom: { id: string; name: string; ownerId?: string } | null;
  breadcrumb: BreadcrumbItem[];
  subfolders: FolderNode[];
  files: FileNode[];
}

export type ResourceType = 'DATA_ROOM' | 'FOLDER' | 'FILE';
export type ShareType = 'PUBLIC_LINK' | 'PERMISSIONED';

export interface ShareGrantee {
  id: string;
  email: string;
}

export interface ShareRecord {
  id: string;
  resourceType: ResourceType;
  shareType: ShareType;
  token: string | null;
  revoked: boolean;
  createdAt: string;
  grantees: ShareGrantee[];
}

export interface SharedWithMeEntry {
  id: string;
  resourceType: ResourceType;
  resourceName: string;
  entryFolderId?: string;
  dataRoomId: string | null;
  folderId: string | null;
  fileId: string | null;
  createdAt: string;
}
