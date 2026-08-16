import { Copy, Link2, Mail, Trash2 } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast-context';
import { api } from '@/lib/api';
import type { ResourceType, ShareRecord } from '@/types';

export function ShareDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
}) {
  const { toast } = useToast();
  const [shares, setShares] = React.useState<ShareRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [creatingLink, setCreatingLink] = React.useState(false);
  const [inviting, setInviting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ShareRecord[]>(
        `/shares?resourceType=${resourceType}&resourceId=${resourceId}`,
      );
      setShares(data);
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  const publicLink = shares.find((s) => s.shareType === 'PUBLIC_LINK');
  const permissioned = shares.filter((s) => s.shareType === 'PERMISSIONED');

  const createPublicLink = async () => {
    setCreatingLink(true);
    try {
      const share = await api.post<ShareRecord>('/shares', {
        resourceType,
        resourceId,
        shareType: 'PUBLIC_LINK',
      });
      setShares((prev) => [share, ...prev]);
    } catch (err: any) {
      toast({ title: 'Could not create link', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingLink(false);
    }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const share = await api.post<ShareRecord>('/shares', {
        resourceType,
        resourceId,
        shareType: 'PERMISSIONED',
        emails: [email.trim()],
      });
      setShares((prev) => [share, ...prev]);
      setEmail('');
      toast({
        title: 'Invite sent',
        description: `${email.trim()} can now view this ${resourceType.toLowerCase()}.`,
      });
    } catch (err: any) {
      toast({ title: 'Could not invite', description: err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const revoke = async (id: string) => {
    await api.delete(`/shares/${id}`);
    setShares((prev) => prev.filter((s) => s.id !== id));
    toast({ title: 'Access revoked' });
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{resourceName}&rdquo;</DialogTitle>
          <DialogDescription>Recipients get read-only access.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="w-4 h-4" /> Public link
          </div>
          {publicLink ? (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/share/${publicLink.token}`}
                className="text-xs"
              />
              <Button size="icon" variant="outline" onClick={() => copyLink(publicLink.token!)}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => revoke(publicLink.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={createPublicLink}
              disabled={creatingLink}
              className="w-fit"
            >
              {creatingLink ? 'Creating...' : 'Create public link'}
            </Button>
          )}
        </div>

        <div className="grid gap-2 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Mail className="w-4 h-4" /> Invite specific people
          </div>
          <form onSubmit={invite} className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={inviting || !email.trim()}>
              {inviting ? 'Inviting...' : 'Invite'}
            </Button>
          </form>

          {!loading && permissioned.length > 0 && (
            <ul className="mt-1 grid gap-1.5">
              {permissioned.flatMap((s) =>
                s.grantees.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {g.email} <Badge variant="secondary">Viewer</Badge>
                    </span>
                    <button
                      onClick={() => revoke(s.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Revoke access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                )),
              )}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
