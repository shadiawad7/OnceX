// Collect server pages so lists remain complete without page navigation controls.
export async function listPages<T>(load: (page: number) => Promise<{ items: T[]; count: number }>, active: () => boolean = () => true): Promise<{ items: T[]; count: number }> {
 const items: T[] = [];
 let count = 0;
 for (let page = 0; active(); page++) {
  const result = await load(page);
  count = result.count;
  items.push(...result.items);
  if (!result.items.length || items.length >= count) break;
 }
 return { items, count };
}
