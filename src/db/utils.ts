import * as fs from "fs";
import globby from "globby";

// import path from "path";
// import { globby } from "globby";
import fm from "front-matter";

export const load_file = (filename: string) => {
  const raw = fs.readFileSync(filename, {
    encoding: "utf8",
  });
  const content = fm(raw);
  const { body, attributes }: { body: string; attributes: any } = content;
  attributes.name = attributes.route_name;
  delete attributes.route_name;
  return {
    ...attributes,
  };
};

export const load_dir = async (contentDir: string) => {
  const baseDir = contentDir.replace(/\/+$/g, "");

  // Get all leaf files, excluding dirs with only index.md
  const leafFiles = await globby([
    `${baseDir}/**/*.md`,
    `!${baseDir}/**/index.md`,
  ]);

  if (leafFiles.length === 0) {
    console.log("No files found");
    process.exit(0);
  }
  const data = leafFiles.map((file) => {
    return load_file(file);
  });
  return data;
};
