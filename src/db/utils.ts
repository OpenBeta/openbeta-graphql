import * as fs from "fs";
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

const load_dir = async (files: string[], mapperFn?: Function) => {
  if (files.length === 0) {
    console.log("No files found");
    return [];
  }

  const data = files.map((file) => {
    return load_md_file(file, mapperFn);
  });
  return data;
};

export const load_areas = async (contentDir: string) => {
  const baseDir = contentDir.replace(/\/+$/g, "");
  const areaFiles = await globby([`${baseDir}/**/index.md`]);
  return load_dir(areaFiles, area_column_mapper);
};

export const load_climbs = async (contentDir: string) => {
  const baseDir = contentDir.replace(/\/+$/g, "");
  const climbFiles = await globby([
    `${baseDir}/**/*.md`,
    `!${baseDir}/**/index.md`,
  ]);
  return load_dir(climbFiles, climb_column_mapper);
};

const climb_column_mapper = (attrs) => {
  attrs.name = attrs.route_name;
  delete attrs.route_name;
};

const area_column_mapper = (attrs) => {
    attrs['children'] = []
};
