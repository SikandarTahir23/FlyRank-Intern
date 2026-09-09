import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

export function parseMarkdown(content: string): { title: string; html: string; text: string } {
  const tokens = md.parse(content, {});
  
  let title = '';
  for (const token of tokens) {
    if (token.type === 'heading_open' && token.tag === 'h1') {
      const nextToken = tokens[tokens.indexOf(token) + 1];
      if (nextToken && nextToken.type === 'inline') {
        title = nextToken.content;
        break;
      }
    }
  }

  const html = md.render(content);
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  return { title, html, text };
}

export function extractFirstHeading(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

export function stripMarkdown(content: string): string {
  return content
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

export function truncateToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const truncated = text.slice(0, limit - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > limit * 0.8 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
}