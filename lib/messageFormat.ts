export interface MessageReplyMeta {
  messageId: string;
  displayName: string;
  content: string;
  avatarUrl: string | null;
  userId: string;
  createdAt: string;
}

const REPLY_PREFIX = '[[sihalo-reply:';

export function encodeMessageContent(content: string, replyMeta?: MessageReplyMeta | null) {
  if (!replyMeta) return content;
  return `${REPLY_PREFIX}${encodeURIComponent(JSON.stringify(replyMeta))}]]\n${content}`;
}

export function decodeMessageContent(rawContent: string) {
  const match = rawContent.match(/^\[\[sihalo-reply:([^\]]+)\]\]\n([\s\S]*)$/);

  if (!match) {
    return { content: rawContent, replyMeta: null as MessageReplyMeta | null };
  }

  try {
    const replyMeta = JSON.parse(decodeURIComponent(match[1])) as MessageReplyMeta;
    return { content: match[2], replyMeta };
  } catch {
    return { content: rawContent, replyMeta: null as MessageReplyMeta | null };
  }
}
