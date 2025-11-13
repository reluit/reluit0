export function slugify(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

