import * as fs from "fs";
import path from "path";
import globby from "globby";
import fm from "front-matter";
import crypto from "crypto";

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

  await Promise.all(
    leafAreaPaths.map(async (indexMd) => {
      const area = load_md_file(indexMd, area_column_mapper);
      const dir = path.posix.dirname(indexMd);
      const climbs = await load_all_climbs_in_dir(baseDir, dir);
      area.climbs = climbs;
      onAreaLoaded({ ...area, ...parentRefs(baseDir, dir) });
    })
  );
};

const load_all_climbs_in_dir = async (baseDir, currentDir: string) => {
  const climbFiles = await globby([
    `${currentDir}/*.md`,
    `!${currentDir}/index.md`,
  ]);

  return climbFiles.map((file) => {
    const climb = load_md_file(file, climb_column_mapper);
    return climb;
  });
};

const climb_column_mapper = (attrs) => {
  attrs.name = attrs.route_name;
  delete attrs.route_name;
};

const area_column_mapper = (attrs) => {
  attrs["climbs"] = [];
};

const getLeafAreaPaths = async (baseDir: string): Promise<string[]> => {
  const leafFiles = await globby([
    `${baseDir}/**/index.md`,
  ]);

  if (leafFiles.length === 0) {
    console.log("No files found");
    process.exit(0);
  }

  // Build a collection of leaf walls
  // 1. Remove file name from path
  // 2. Add to Set to remove duplicates
  // const dirs = leafFiles.reduce((acc, curr) => {
  //   acc.add(path.posix.dirname(curr));
  //   return acc;
  // }, new Set<string>());

  // de-dups
  //const leafAreaPaths = [...dirs];

  // to make test deterministic
  leafFiles.sort();
  return leafFiles;
};

const parentRefs = (baseDir: string, currentDir: string) => {
  return {
    parentHashRef: md5(
      path.posix.relative(baseDir, path.posix.dirname(currentDir))
    ),
    pathHash: md5(path.posix.relative(baseDir, currentDir)),
  };
};

const md5 = (data: string) =>
  crypto.createHash("md5").update(data).digest("hex");
