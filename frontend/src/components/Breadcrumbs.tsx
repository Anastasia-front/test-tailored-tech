import { ChevronRight, FolderLock } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { BreadcrumbItem } from '@/types';

export function Breadcrumbs({ roomId, items }: { roomId: string; items: BreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, idx) => (
        <span key={item.id} className="flex items-center gap-1">
          {idx > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {idx === items.length - 1 ? (
            <span className="flex items-center gap-1 font-medium text-foreground">
              {item.isRoot && <FolderLock className="h-3.5 w-3.5" />}
              {item.name}
            </span>
          ) : (
            <Link
              to={`/rooms/${roomId}/folders/${item.id}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              {item.isRoot && <FolderLock className="h-3.5 w-3.5" />}
              {item.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
