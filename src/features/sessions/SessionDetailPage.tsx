import { useEffect } from 'react';
import { useParams } from 'react-router';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { MethodBadge } from '@/shared/components/MethodBadge';
import { formatDuration } from '@/lib/format';

import { fetchSessionDetail, selectCurrentSessionDetail } from './sessionsSlice';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const detail = useAppSelector(selectCurrentSessionDetail);

  useEffect(() => {
    if (id) dispatch(fetchSessionDetail(Number(id)));
  }, [id, dispatch]);

  const session = detail && String(detail.id) === id ? detail : null;

  if (!session) {
    return (
      <div className="p-10">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-10">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-display">Session #{id}</h1>
        <MethodBadge method={session.method} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Duration" value={formatDuration(session.duration_seconds)} />
        <Stat label="Mood" value={session.mood ? `${session.mood}/5` : '—'} />
        <Stat label="Productivity" value={session.productivity_score ? `${session.productivity_score}/10` : '—'} />
        <Stat label="Interruptions" value={String(session.interruptions_count)} />
      </div>

      {session.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{session.notes}</p>
          </CardContent>
        </Card>
      )}

      {session.stages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.stages.map((stage) => (
              <div key={stage.id} className="border-l-2 border-border pl-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stage.stage_name.replace(/_/g, ' ')}
                </p>
                {stage.content && <p className="mt-1 text-sm">{stage.content}</p>}
                {stage.rating !== null && <p className="mt-1 text-sm text-muted-foreground">Rating: {stage.rating}/5</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-display">{value}</p>
      </CardContent>
    </Card>
  );
}
