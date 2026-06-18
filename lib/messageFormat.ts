export interface MessageReplyMeta {
  messageId: string;
  displayName: string;
  content: string;
  avatarUrl: string | null;
  userId: string;
  createdAt: string;
}

export interface MessageAttachment {
  url: string;
  type: 'image' | 'audio';
  name?: string;
}

const REPLY_PREFIX = '[[sihalo-reply:';
const ATTACH_PREFIX = '[[sihalo-attach:';

export function encodeMessageContent(
  content: string,
  replyMeta?: MessageReplyMeta | null,
  attachments?: MessageAttachment[] | null
) {
  let encoded = '';

  if (replyMeta) {
    encoded += `${REPLY_PREFIX}${encodeURIComponent(JSON.stringify(replyMeta))}]]\n`;
  }

  if (attachments && attachments.length > 0) {
    encoded += `${ATTACH_PREFIX}${encodeURIComponent(JSON.stringify(attachments))}]]\n`;
  }

  encoded += content;
  return encoded;
}

export function decodeMessageContent(rawContent: string) {
  let remaining = rawContent;
  let replyMeta: MessageReplyMeta | null = null;
  let attachments: MessageAttachment[] | null = null;

  // Extract reply meta
  const replyMatch = remaining.match(/^\[\[sihalo-reply:([^\]]+)\]\]\n([\s\S]*)$/);
  if (replyMatch) {
    try {
      replyMeta = JSON.parse(decodeURIComponent(replyMatch[1])) as MessageReplyMeta;
      remaining = replyMatch[2];
    } catch {
      // ignore parse error
    }
  }

  // Extract attachments
  const attachMatch = remaining.match(/^\[\[sihalo-attach:([^\]]+)\]\]\n([\s\S]*)$/);
  if (attachMatch) {
    try {
      attachments = JSON.parse(decodeURIComponent(attachMatch[1])) as MessageAttachment[];
      remaining = attachMatch[2];
    } catch {
      // ignore parse error
    }
  }

  return { content: remaining, replyMeta, attachments };
}
