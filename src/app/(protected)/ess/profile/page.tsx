'use client';

import { useCallback, useEffect, useState } from 'react';
import { essApi, type EssProfile, type ProfileChangeRequest } from '@/lib/api/ess';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { EssNav } from '@/components/modules/ess/EssNav';
import { InfoRow } from '@/components/modules/ess/InfoRow';
import { ProfileChangeForm } from '@/components/modules/ess/ProfileChangeForm';
import { formatDate, formatDateTime } from '@/components/modules/ess/format';
import { Card, CardHeader, CardBody, LoadingState, EmptyState, Badge } from '@/components/ui';

const REQUEST_TONE = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
} as const;

function ProfileView() {
  const [profile, setProfile] = useState<EssProfile | null>(null);
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const res = await essApi.listProfileRequests({ limit: 10 });
      setRequests(res.data);
    } catch {
      // Non-fatal: the request history is supplementary.
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await essApi.profile();
        if (active) setProfile(p);
        await loadRequests();
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load profile');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadRequests]);

  const addr = profile?.currentAddress;
  const addrLine = addr
    ? [addr.line1, addr.line2, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean).join(', ')
    : undefined;

  return (
    <div>
      <PageHeader title="My profile" description="Review your details and request changes to editable fields." />

      <EssNav />

      {loading ? (
        <LoadingState />
      ) : error || !profile ? (
        <EmptyState title="Couldn't load your profile" description={error ?? 'Please refresh the page.'} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Read-only details */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader
                title={profile.fullName}
                description={`${profile.employeeCode} · ${profile.status}`}
              />
              <CardBody>
                <dl className="divide-y divide-border">
                  <InfoRow label="Work email" value={profile.email} />
                  <InfoRow label="Personal email" value={profile.personalEmail} />
                  <InfoRow label="Phone" value={profile.phone} />
                  <InfoRow label="Date of joining" value={formatDate(profile.dateOfJoining)} />
                  <InfoRow label="Employment type" value={profile.employmentType} />
                  <InfoRow label="Work mode" value={profile.workMode} />
                  <InfoRow label="Location" value={profile.locationName} />
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Personal" />
              <CardBody>
                <dl className="divide-y divide-border">
                  <InfoRow label="Gender" value={profile.gender} />
                  <InfoRow label="Date of birth" value={formatDate(profile.dateOfBirth)} />
                  <InfoRow label="Blood group" value={profile.bloodGroup} />
                  <InfoRow label="Current address" value={addrLine} />
                  <InfoRow label="Bank" value={profile.bank?.bankName} />
                  <InfoRow label="IFSC" value={profile.bank?.ifsc} />
                </dl>
              </CardBody>
            </Card>

            {profile.emergencyContacts.length > 0 && (
              <Card>
                <CardHeader title="Emergency contacts" />
                <CardBody className="space-y-3">
                  {profile.emergencyContacts.map((c, i) => (
                    <div key={i} className="rounded-md border border-border bg-surface-2/40 px-3 py-2">
                      <p className="text-sm font-medium text-fg">
                        {c.name}
                        {c.relationship && <span className="font-normal text-muted"> · {c.relationship}</span>}
                      </p>
                      <p className="text-xs text-muted">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</p>
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}
          </div>

          {/* Change request + history */}
          <div className="space-y-6">
            <Card>
              <CardHeader title="Request a change" description="Update your editable personal details." />
              <CardBody>
                <ProfileChangeForm onSubmitted={loadRequests} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="My requests" />
              <CardBody>
                {requests.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted">No change requests yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {requests.map((r) => (
                      <li key={r.id} className="rounded-md border border-border bg-surface-2/40 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-fg">{r.field}</span>
                          <Badge tone={REQUEST_TONE[r.status]} dot>
                            {r.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted">{r.newValue}</p>
                        <p className="mt-0.5 text-2xs text-muted">{formatDateTime(r.createdAt)}</p>
                        {r.reviewNote && (
                          <p className="mt-1 text-xs text-fg-subtle">HR: {r.reviewNote}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EssProfilePage() {
  return (
    <RequirePermission permission="ess:view">
      <ProfileView />
    </RequirePermission>
  );
}
