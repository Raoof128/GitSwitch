export const getEffectiveAccountId = (
  selectedAccountId: string | null,
  defaultAccountId: string | null
): string | null => selectedAccountId ?? defaultAccountId ?? null
