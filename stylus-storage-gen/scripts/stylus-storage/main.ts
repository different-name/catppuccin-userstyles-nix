import usercssMeta from "usercss-meta";
import { calcStyleDigest } from "https://github.com/openstyles/stylus/raw/8fe35a4b90d85fb911bd7aa1deab4e4733c31150/src/js/sections-util.js";
import { getUserstylesFiles } from "@/utils.ts";
import less from "less";
import postcss from "postcss";

async function getStylesDir(): Promise<string | null> {
  if (Deno.args.length < 1) return null;

  const stylesPath = Deno.args[0];
  const stylesStat = await Deno.stat(stylesPath);

  if (!stylesStat.isDirectory) return null;

  return stylesPath;
}

type UserstylesOptions = Record<string, Record<string, string | number>>;

function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

function isStringOrNumber(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

function isValidUserstylesOptions(obj: unknown): obj is UserstylesOptions {
  if (!isRecord(obj)) return false;

  for (const value of Object.values(obj)) {
    if (!isRecord(value)) return false;
    if (!Object.values(value).every(isStringOrNumber)) return false;
  }

  return true;
}

async function getUserstylesOptions(): Promise<UserstylesOptions> {
  if (Deno.args.length < 2) return {};
  const jsonPath = Deno.args[1];
  const rawData = await Deno.readTextFile(jsonPath);
  const json = JSON.parse(rawData);

  if (!isValidUserstylesOptions(json)) {
    throw new Error("Invalid JSON");
  }

  return json;
}

function getUserstylesOption(
  userstylesOptions: UserstylesOptions,
  key: string,
  subKey: string,
): string | number | null {
  if (!(key in userstylesOptions)) return null;
  if (!(subKey in userstylesOptions[key])) return null;
  return userstylesOptions[key][subKey];
}

function bakeUserstyleVar(
  name: string,
  info: unknown,
  metadata: usercssMeta.Metadata,
  userstylesOptions: UserstylesOptions,
): string {
  let value = getUserstylesOption(
    userstylesOptions,
    `Userstyle ${metadata.name}`,
    name,
  );

  if (value === null) {
    value = getUserstylesOption(userstylesOptions, "global", name);
  }

  if (
    value === null &&
    isRecord(info) &&
    "default" in info &&
    isStringOrNumber(info.default)
  ) {
    value = info.default;
  }

  if (value === null) {
    throw new Error(`Could not find value for ${metadata.name} ${name}`);
  }

  return `@${name}: ${value};`;
}

function generateSections(
  userstyleBlock: string,
  css: string,
): Record<string, unknown>[] {
  const cssRoot: postcss.Root = postcss.parse(css);

  const sections = [
    {
      code: userstyleBlock,
      start: 0,
    },
  ] as Record<string, unknown>[];

  cssRoot.walkAtRules("-moz-document", (rule: postcss.AtRule) => {
    const innerCss = rule.nodes?.map((n) => n.toString()).join("\n") ?? "";
    const section = {
      code: innerCss,
      start: sections.map((s) => s.code).join().length,
    } as Record<string, unknown>;

    function addRule(rule: string, value: string) {
      if (Array.isArray(section[rule])) {
        section[rule].push(value);
      } else {
        section[rule] = [value];
      }
    }

    const conditions: string[] = (rule.params ?? "").split(", ");
    conditions.forEach((condition) => {
      const match = condition.match(/^([\w-]+)\("(.+)"\)$/);

      if (match) {
        const value = match[2].replace(/\\\\/g, "\\");

        switch (match[1]) {
          case "domain":
            addRule("domains", value);
            break;
          case "regexp":
            addRule("regexps", value);
            break;
          case "url-prefix":
            addRule("urlPrefixes", value);
            break;
        }
      }
    });

    rule.remove();
    sections.push(section);
  });

  cssRoot.walkComments((comment) => {
    comment.remove();
    return;
  });
  const unhandledCss = cssRoot.toString().trim();
  if (unhandledCss.length > 0) {
    throw new Error(`Unhandled CSS '${unhandledCss}'`);
  }

  return sections;
}

async function generateStorageData(): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {
    // required for stylus to continue to use storage.js file
    dbInChromeStorage: true,
  };

  const stylesDir = await getStylesDir();
  if (stylesDir === null) throw new Error("Expected path to styles directory");

  const userstylesOptions = await getUserstylesOptions();

  for (const [index, file] of getUserstylesFiles(stylesDir).entries()) {
    const content = await Deno.readTextFile(file);
    const { metadata } = usercssMeta.parse(content);

    if ("updateURL" in metadata) {
      delete metadata.updateURL;
    }

    const fileInfo = await Deno.stat(file);
    const mtime = fileInfo.mtime ? fileInfo.mtime.getTime() : 0;

    const vars = metadata.vars || {};
    const lessVars = Object.entries(vars).map(
      ([name, info]) =>
        bakeUserstyleVar(name, info, metadata, userstylesOptions),
    ).join("\n");
    for (const key in metadata.vars) {
      delete metadata.vars[key];
    }

    const userstyleBlockNoVars =
      usercssMeta.stringify(metadata, { alignKeys: true }) + "\n";
    const contentBakedVars = lessVars + "\n" +
      content.replace(/\/\*\s*==UserStyle==[\s\S]*?==\/UserStyle==\s*\*\//, "");

    const compiledCss = await (async () => {
      try {
        return (await less.render(contentBakedVars, { filename: file })).css;
      } catch (err) {
        throw new Error(`Failed to compile LESS in ${file}: ${err}`);
      }
    })();

    const sections = (() => {
      try {
        return generateSections(userstyleBlockNoVars, compiledCss);
      } catch (err) {
        throw new Error(`Failed to compile LESS in ${file}: ${err}`);
      }
    })();

    const userstyle = {
      enabled: true,
      name: metadata.name,
      description: metadata.description,
      author: metadata.author,
      url: metadata.url,
      usercssData: metadata,
      sourceCode: userstyleBlockNoVars + contentBakedVars,
      sections: sections,
      _id: crypto.randomUUID(),
      _rev: mtime,
      id: index + 1,
    } as Record<string, unknown>;

    userstyle.originalDigest = await calcStyleDigest(userstyle);

    data[`style-${index + 1}`] = userstyle;
  }

  return data;
}

const storageData = await generateStorageData();
await Deno.writeTextFile("storage.js", JSON.stringify(storageData));
