export const APPLICATION_LIST_SORTS = [
  "updated_desc",
  "created_desc",
  "applied_desc",
  "title_asc",
] as const;

export const APPLICATION_ARCHIVE_FILTERS = [
  "active",
  "archived",
  "all",
] as const;

export const APPLICATION_WORK_MODES = [
  "remote",
  "hybrid",
  "onsite",
  "unknown",
] as const;

export type ApplicationListSort = (typeof APPLICATION_LIST_SORTS)[number];
export type ApplicationArchiveFilter =
  (typeof APPLICATION_ARCHIVE_FILTERS)[number];
export type ApplicationWorkMode = (typeof APPLICATION_WORK_MODES)[number];

export type ApplicationListFilters = {
  q?: string | null;
  stage?: string | null;
  source?: string | null;
  channel?: string | null;
  workMode?: ApplicationWorkMode | string | null;
  archive?: ApplicationArchiveFilter | string | null;
  sort?: ApplicationListSort | string | null;
  page?: number | string | null;
  pageSize?: number | string | null;
};

export type NormalizedApplicationListFilters = {
  q: string;
  stage?: string;
  source?: string;
  channel?: string;
  workMode?: ApplicationWorkMode;
  archive: ApplicationArchiveFilter;
  sort: ApplicationListSort;
  page: number;
  pageSize: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asPositiveInteger(
  value: number | string | null | undefined,
  fallback: number,
) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function asOwnedId(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && UUID_PATTERN.test(normalized) ? normalized : undefined;
}

function isOneOf<T extends string>(
  value: string | null | undefined,
  options: readonly T[],
): value is T {
  return typeof value === "string" && options.includes(value as T);
}

export function normalizeApplicationListFilters(
  filters: ApplicationListFilters = {},
): NormalizedApplicationListFilters {
  const pageSize = Math.min(asPositiveInteger(filters.pageSize, 25), 100);

  return {
    q: filters.q?.trim().replace(/\s+/g, " ").slice(0, 160) ?? "",
    ...(asOwnedId(filters.stage) ? { stage: asOwnedId(filters.stage) } : {}),
    ...(asOwnedId(filters.source)
      ? { source: asOwnedId(filters.source) }
      : {}),
    ...(asOwnedId(filters.channel)
      ? { channel: asOwnedId(filters.channel) }
      : {}),
    ...(isOneOf(filters.workMode, APPLICATION_WORK_MODES)
      ? { workMode: filters.workMode }
      : {}),
    archive: isOneOf(filters.archive, APPLICATION_ARCHIVE_FILTERS)
      ? filters.archive
      : "active",
    sort: isOneOf(filters.sort, APPLICATION_LIST_SORTS)
      ? filters.sort
      : "updated_desc",
    page: asPositiveInteger(filters.page, 1),
    pageSize,
  };
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function normalizedDuplicateText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function normalizeCompanyKey(value: string) {
  return normalizedDuplicateText(value);
}

export function normalizeJobTitleKey(value: string) {
  return normalizedDuplicateText(value);
}
