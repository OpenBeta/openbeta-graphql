import * as fs from "fs";
import path from "path";
import globby from "globby";
import fm from "front-matter";

const load_md_file = (filename: string, xformer?: Function) => {
  const raw = fs.readFileSync(filename, {
    encoding: "utf8",
  });
  const content = fm(raw);
  const { attributes }: { body: string; attributes: any } = content;
  xformer && xformer(attributes);

  return {
    ...attributes,
  };
};

const load_dir = (files: string[], mapperFn?: Function) => {
  if (files.length === 0) {
    console.log("No files found");
    return [];
  }

  const data = files.map((file) => {
    return load_md_file(file, mapperFn);
  });
  return data;
};

export const load_areas = async (
  contentDir: string,
  onAreaLoaded: (area) => void
) => {
  const baseDir = contentDir.replace(/\/+$/g, "");

  const leafAreaPaths = await getLeafAreaPaths(baseDir);

  leafAreaPaths.forEach(async (dir) => {
    const areaIndexMd = path.posix.join(dir, "index.md");
    const area = load_md_file(areaIndexMd, area_column_mapper);
    const climbs = await load_all_climbs_in_dir(dir);
    area.children = climbs;
    onAreaLoaded(area)
  });
};

const load_all_climbs_in_dir = async (currentDir: string) => {
  const climbFiles = await globby([
    `${currentDir}/**/*.md`,
    `!${currentDir}/**/index.md`,
  ]);

  const data = climbFiles.map((file) =>
    load_md_file(file, climb_column_mapper)
  );
  return data;
};

const climb_column_mapper = (attrs) => {
  attrs.name = attrs.route_name;
  delete attrs.route_name;
};

const area_column_mapper = (attrs) => {
  attrs["children"] = [];
};

const getLeafAreaPaths = async (baseDir: string): Promise<string[]> => {
  // Get all leaf files, excluding dirs with only index.md
  const leafFiles = await globby([
    `${baseDir}/**/*.md`,
    `!${baseDir}/**/index.md`,
  ]);

  if (leafFiles.length === 0) {
    console.log("No files found");
    process.exit(0);
  }

  // Build a collection of leaf walls
  // 1. Remove file name from path
  // 2. Add to Set to remove duplicates
  const dirs = leafFiles.reduce((acc, curr) => {
    acc.add(path.dirname(curr));
    return acc;
  }, new Set<string>());

  // de-dups
  const leafAreaPaths = [...dirs];

  // to make test deterministic
  leafAreaPaths.sort();
  return leafAreaPaths;
};
