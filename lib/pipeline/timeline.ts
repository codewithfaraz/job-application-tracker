export type TimelineSource = {
  stageHistory: Array<{
    id: string;
    occurredAt: string;
    notes: string | null;
    fromStage: { name: string } | null;
    toStage: { name: string };
  }>;
  events: Array<{
    id: string;
    title: string;
    type: string;
    startsAt: string;
    notes: string | null;
  }>;
  notes: Array<{
    id: string;
    body: string;
    createdAt: string;
  }>;
};

export type ApplicationTimelineEntry = {
  id: string;
  kind: "stage" | "event" | "note";
  occurredAt: string;
  title: string;
  detail: string | null;
};

export function buildApplicationTimeline(
  source: TimelineSource,
): ApplicationTimelineEntry[] {
  const stageEntries: ApplicationTimelineEntry[] = source.stageHistory.map(
    (entry) => ({
      id: `stage-${entry.id}`,
      kind: "stage",
      occurredAt: entry.occurredAt,
      title: entry.fromStage
        ? `${entry.fromStage.name} → ${entry.toStage.name}`
        : `Started at ${entry.toStage.name}`,
      detail: entry.notes,
    }),
  );
  const eventEntries: ApplicationTimelineEntry[] = source.events.map(
    (entry) => ({
      id: `event-${entry.id}`,
      kind: "event",
      occurredAt: entry.startsAt,
      title: entry.title,
      detail: entry.notes || entry.type.replaceAll("_", " "),
    }),
  );
  const noteEntries: ApplicationTimelineEntry[] = source.notes.map((entry) => ({
    id: `note-${entry.id}`,
    kind: "note",
    occurredAt: entry.createdAt,
    title: "Note added",
    detail: entry.body,
  }));

  return [...stageEntries, ...eventEntries, ...noteEntries].sort((left, right) => {
    const timeDifference =
      new Date(right.occurredAt).valueOf() - new Date(left.occurredAt).valueOf();
    return timeDifference || right.id.localeCompare(left.id);
  });
}
