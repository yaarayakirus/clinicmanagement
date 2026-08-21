export type TenantOwnedQuery = Record<string, unknown> & {
  tenantId?: string;
};

export function tenantScopedQuery<TQuery extends Record<string, unknown>>(
  tenantId: string,
  query: TQuery = {} as TQuery,
): TQuery & { tenantId: string } {
  if (!tenantId) {
    throw new Error("tenantId is required for tenant-owned queries");
  }

  return {
    ...query,
    tenantId,
  };
}
