import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseMarkdown, extractFirstHeading, stripMarkdown } from './markdown.js';

const httpClient = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; SocialMediaStudio/1.0; +https://github.com/social-media-studio)',
  },
});

export async function fetchAndExtractContent(url: string): Promise<{
  title: string;
  markdown: string;
  description: string;
}> {
  const response = await httpClient.get<string>(url);
  const $ = cheerio.load(response.data);

  // Remove unwanted elements
  $('script, style, nav, header, footer, aside, .ads, .advertisement, [class*="cookie"], [id*="cookie"]').remove();

  // Try to find main content
  const selectors = [
    'article',
    '[role="main"]',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.content',
    'main',
    '#content',
  ];

  let contentElement = null;
  for (const selector of selectors) {
    contentElement = $(selector).first();
    if (contentElement.length) break;
  }

  if (!contentElement || !contentElement.length) {
    contentElement = $('body');
  }

  const html = contentElement.html() || '';
  const $content = cheerio.load(html);

  // Convert to markdown-like text
  $content('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = parseInt(el.tagName.charAt(1), 10);
    $content(el).replaceWith(`${'#'.repeat(level)} ${$content(el).text()}\n\n`);
  });

  $content('p').each((_, el) => {
    $content(el).replaceWith($content(el).text() + '\n\n');
  });

  $content('li').each((_, el) => {
    $content(el).replaceWith(`- ${$content(el).text()}\n`);
  });

  $content('blockquote').each((_, el) => {
    $content(el).replaceWith(`> ${$content(el).text()}\n\n`);
  });

  $content('code').each((_, el) => {
    $content(el).replaceWith(`\`${$content(el).text()}\``);
  });

  $content('pre').each((_, el) => {
    $content(el).replaceWith(`\n\`\`\`\n${$content(el).text()}\n\`\`\`\n\n`);
  });

  $content('a').each((_, el) => {
    const href = $content(el).attr('href');
    const text = $content(el).text();
    if (href && text) {
      $content(el).replaceWith(`[${text}](${href})`);
    }
  });

  $content('img').each((_, el) => {
    const src = $content(el).attr('src');
    const alt = $content(el).attr('alt') || '';
    if (src) {
      $content(el).replaceWith(`![${alt}](${src})`);
    }
  });

  let markdown = $content.text().replace(/\n{3,}/g, '\n\n').trim();
  
  // Extract title from h1 or page title
  const title = extractFirstHeading(markdown) || $('title').text() || $('h1').first().text() || 'Untitled';
  
  // Description from meta or first paragraph
  const description = $('meta[name="description"]').attr('content') 
    || $('meta[property="og:description"]').attr('content')
    || $('p').first().text()
    || '';

  return {
    title: title.trim(),
    markdown,
    description: description.trim().slice(0, 500),
  };
}

export async function fetchUrlPreview(url: string): Promise<{
  title: string;
  description: string;
  image?: string;
}> {
  const response = await httpClient.get<string>(url);
  const $ = cheerio.load(response.data);

  return {
    title: $('meta[property="og:title"]').attr('content') 
      || $('meta[name="twitter:title"]').attr('content')
      || $('title').text() 
      || 'Untitled',
    description: $('meta[property="og:description"]').attr('content')
      || $('meta[name="twitter:description"]').attr('content')
      || $('meta[name="description"]').attr('content')
      || '',
    image: $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content'),
  };
}