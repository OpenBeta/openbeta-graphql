import { spawn } from 'child_process';
import { Ora } from 'ora';
import { createInterface } from 'readline';
import { stringify as uuidStringify } from 'uuid';

interface MongoBinary {
  $binary: {
    base64: string;
    subType: string;
  };
}

interface MongoOid {
  $oid: string;
}

interface MongoDate {
  $date: {
    $numberLong: string;
  };
}

interface MongoInt {
  $numberInt: string;
}

interface MongoDouble {
  $numberDouble: string;
}

function isBinary(val: any): val is MongoBinary {
  return val && typeof val === 'object' && '$binary' in val;
}

function isOid(val: any): val is MongoOid {
  return val && typeof val === 'object' && '$oid' in val;
}

function isDate(val: any): val is MongoDate {
  return val && typeof val === 'object' && '$date' in val;
}

function isInt(val: any): val is MongoInt {
  return val && typeof val === 'object' && '$numberInt' in val;
}

function isDouble(val: any): val is MongoDouble {
  return val && typeof val === 'object' && '$numberDouble' in val;
}

export function transformValue(val: any): any {
  if (isBinary(val)) {
    if (val.$binary.subType === '04') {
      return uuidStringify(Buffer.from(val.$binary.base64, 'base64'));
    }
    return val.$binary.base64;
  }
  if (isOid(val)) {
    return val.$oid;
  }
  if (isDate(val)) {
    return new Date(parseInt(val.$date.$numberLong));
  }
  if (isInt(val)) {
    return parseInt(val.$numberInt);
  }
  if (isDouble(val)) {
    return parseFloat(val.$numberDouble);
  }
  if (Array.isArray(val)) {
    return val.map(transformValue);
  }
  if (val && typeof val === 'object') {
    const res: any = {};
    for (const key in val) {
      res[key] = transformValue(val[key]);
    }
    return res;
  }
  return val;
}

export async function forEachRow<T>(
  collection: string,
  callback: (row: T) => Promise<void>,
  spinner?: Ora,
) {
  const filePath = `./db-dumps/staging/openbeta/${collection}.bson.gz`;
  const proc = spawn('sh', ['-c', `gunzip -c ${filePath} | bsondump --quiet`]);
  const rl = createInterface({ input: proc.stdout });

  let count = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const raw = JSON.parse(line);
      const transformed = transformValue(raw);
      await callback(transformed);
      count++;
      if (count % 1000 === 0 && spinner) {
        spinner.text = `Loaded ${count} rows from ${collection}...`;
      }
    } catch (e) {
      console.error(`Error parsing line in ${collection}:`, e);
    }
  }
  return count;
}

export const uuidToId = new Map<string, number>();
