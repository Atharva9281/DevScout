export async function readJsonFile<T>(path: string): Promise<T> {
  const text = await Deno.readTextFile(path);
  return JSON.parse(text) as T;
}

export async function writeJsonFile<T>(path: string, data: T): Promise<void> {
  const dir = path.substring(0, path.lastIndexOf("/"));
  if (dir) {
    await Deno.mkdir(dir, { recursive: true });
  }
  await Deno.writeTextFile(path, JSON.stringify(data, null, 2));
}
