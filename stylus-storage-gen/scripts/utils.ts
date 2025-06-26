import * as path from "@std/path";

export function getUserstylesFiles(stylesDir: string): string[] {
  const files: string[] = [];
  for (const dir of Deno.readDirSync(stylesDir)) {
    if (!dir.isDirectory) continue;
    files.push(
      path.join(stylesDir, dir.name, "catppuccin.user.less"),
    );
  }
  return files;
}
