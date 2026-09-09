export const DISCORD_LIMITS = {
  MESSAGE_CONTENT: 2000,
  EMBED_TITLE: 256,
  EMBED_DESCRIPTION: 4096,
  EMBED_FIELD_NAME: 256,
  EMBED_FIELD_VALUE: 1024,
  EMBED_FOOTER: 2048,
  EMBED_AUTHOR_NAME: 256,
  TOTAL_EMBED_CHARS: 6000,
  MAX_EMBEDS: 10,
  MAX_FILE_SIZE_MB: 25,
} as const;

interface DiscordEmbed {
  title?: string;
  description?: string;
  footer?: { text?: string };
  author?: { name?: string };
  fields?: Array<{ name?: string; value?: string }>;
}

function isDiscordEmbed(value: unknown): value is DiscordEmbed {
  return typeof value === 'object' && value !== null;
}

export function validateDiscordEmbeds(metadata: Record<string, unknown> | undefined, errors: Array<{ field: string; message: string }>): void {
  if (!metadata?.embeds) return;

  const embeds = metadata.embeds as unknown[];
  
  if (embeds.length > DISCORD_LIMITS.MAX_EMBEDS) {
    errors.push({ field: 'metadata.embeds', message: `Maximum ${DISCORD_LIMITS.MAX_EMBEDS} embeds allowed` });
    return;
  }

  let totalChars = 0;
  for (const [index, embed] of embeds.entries()) {
    if (!isDiscordEmbed(embed)) continue;

    if (embed.title && String(embed.title).length > DISCORD_LIMITS.EMBED_TITLE) {
      errors.push({ field: `metadata.embeds[${index}].title`, message: `Title exceeds ${DISCORD_LIMITS.EMBED_TITLE} characters` });
    }
    if (embed.description && String(embed.description).length > DISCORD_LIMITS.EMBED_DESCRIPTION) {
      errors.push({ field: `metadata.embeds[${index}].description`, message: `Description exceeds ${DISCORD_LIMITS.EMBED_DESCRIPTION} characters` });
    }
    if (embed.footer?.text && String(embed.footer.text).length > DISCORD_LIMITS.EMBED_FOOTER) {
      errors.push({ field: `metadata.embeds[${index}].footer.text`, message: `Footer exceeds ${DISCORD_LIMITS.EMBED_FOOTER} characters` });
    }
    if (embed.author?.name && String(embed.author.name).length > DISCORD_LIMITS.EMBED_AUTHOR_NAME) {
      errors.push({ field: `metadata.embeds[${index}].author.name`, message: `Author name exceeds ${DISCORD_LIMITS.EMBED_AUTHOR_NAME} characters` });
    }

    if (embed.fields) {
      for (const [fieldIndex, field] of embed.fields.entries()) {
        if (field.name && String(field.name).length > DISCORD_LIMITS.EMBED_FIELD_NAME) {
          errors.push({ field: `metadata.embeds[${index}].fields[${fieldIndex}].name`, message: `Field name exceeds ${DISCORD_LIMITS.EMBED_FIELD_NAME} characters` });
        }
        if (field.value && String(field.value).length > DISCORD_LIMITS.EMBED_FIELD_VALUE) {
          errors.push({ field: `metadata.embeds[${index}].fields[${fieldIndex}].value`, message: `Field value exceeds ${DISCORD_LIMITS.EMBED_FIELD_VALUE} characters` });
        }
        totalChars += String(field.name || '').length + String(field.value || '').length;
      }
    }

    totalChars += String(embed.title || '').length + String(embed.description || '').length;
  }

  if (totalChars > DISCORD_LIMITS.TOTAL_EMBED_CHARS) {
    errors.push({ field: 'metadata.embeds', message: `Total embed content exceeds ${DISCORD_LIMITS.TOTAL_EMBED_CHARS} characters` });
  }
}