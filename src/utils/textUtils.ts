/**
 * Decodes HTML entities in a string
 * @param text The text containing HTML entities to decode
 * @returns The decoded text
 */
export function decodeHtmlEntities(text: string): string {
    if (!text) return "";

    // Check if the text contains any HTML entities
    if (!text.includes("&")) return text;

    return text
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&mdash;/g, "—")
        .replace(/&ndash;/g, "–")
        .replace(/&#10;/g, "\n");
}
