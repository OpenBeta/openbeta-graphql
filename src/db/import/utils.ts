import * as fs from 'fs'
import path from 'path'
import globby from 'globby'
import fm from 'front-matter'
import crypto from 'crypto'

const loadMdFile = (filename: string, xformer: Function): any => {
  const raw = fs.readFileSync(filename, {
    encoding: 'utf8'
  })
  const content = fm(raw)
  const { attributes }: { attributes: any } = content

  if (xformer !== null) xformer(attributes)

  return {
    ...attributes
  }
}

// const loadDir = (files: string[], mapperFn?: Function) => {
//   if (files.length === 0) {
//     console.log('No files found')
//     return []
//   }

//   const data = files.map((file) => {
//     return loadMdFile(file, mapperFn)
//   })
//   return data
// }

export const loadAreas = async (
  contentDir: string,
  onAreaLoaded: (area) => any
): Promise<void> => {
  const baseDir = contentDir.replace(/\/+$/g, '')

  const leafAreaPaths = await getLeafAreaPaths(baseDir)

  await Promise.all(
    leafAreaPaths.map(async (indexMd) => {
      const area = loadMdFile(indexMd, areaColumnMapper)
      const dir = path.posix.dirname(indexMd)
      const climbs = await loadAllClimbsInDir(baseDir, dir)
      area.climbs = climbs
      onAreaLoaded({ ...area, ...parentRefs(baseDir, dir) })
    })
  )
}

const loadAllClimbsInDir = async (baseDir, currentDir: string): Promise<any> => {
  const climbFiles = await globby([
    `${currentDir}/*.md`,
    `!${currentDir}/index.md`
  ])

  return climbFiles.map((file) => {
    const climb = loadMdFile(file, climbColumnMapper)
    return climb
  })
}

const climbColumnMapper = (attrs: any): void => {
  if (attrs.safety === '') attrs.safety = 'UNSPECIFIED'
  attrs.name = attrs.route_name
  delete attrs.route_name
}

const areaColumnMapper = (attrs: any): void => {
  attrs.climbs = []
}

const getLeafAreaPaths = async (baseDir: string): Promise<string[]> => {
  const leafFiles = await globby([`${baseDir}/**/index.md`])

  if (leafFiles.length === 0) {
    console.log('No files found')
    process.exit(0)
  }

  // to make test deterministic
  // leafFiles.sort();
  return leafFiles
}

const parentRefs = (baseDir: string, currentDir: string): any => {
  return {
    parentHashRef: md5(
      path.posix.relative(baseDir, path.posix.dirname(currentDir))
    ),
    pathHash: md5(path.posix.relative(baseDir, currentDir))
  }
}

const md5 = (data: string): string =>
  crypto.createHash('md5').update(data).digest('hex')
