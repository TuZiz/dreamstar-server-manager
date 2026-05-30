export function toSafeErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '未知错误';

  return raw
    .replace(/((?:password|passwd|pwd|secret|token)\s*[:=]\s*)([^,\s;]+)/gi, '$1***')
    .replace(/((?:mysql|postgres|postgresql|redis):\/\/[^:]+:)([^@]+)(@)/gi, '$1***$3');
}

export function assertErrorMessage(error: unknown): string {
  const message = toSafeErrorMessage(error);
  return message.trim() || '未知错误';
}
