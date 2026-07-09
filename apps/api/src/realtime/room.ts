export const Rooms = {

  account: (accountId: string) => `account:${accountId}`,
  widget: (accountId: string, widgetId: string) => `widget:${accountId}:${widgetId}`,
  conversation: (conversationId: string) => `conversation:${conversationId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  supportAccount: (accountId: string) => `support:account:${accountId}`,
} as const;