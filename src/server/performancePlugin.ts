import { ApolloServerPlugin } from '@apollo/server';
import { writeToStream } from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';

const PERF_DATA_DIR = path.join(process.cwd(), 'perf-data');
const PERF_FILE = path.join(PERF_DATA_DIR, 'field_resolutions.csv');

interface FieldResolutionRecord {
  timestamp: string;
  operationName: string;
  parentType: string;
  fieldName: string;
  durationMs: string;
}

export const performancePlugin: ApolloServerPlugin<any> = {
  async requestDidStart(requestContext) {
    const operationName = requestContext.request.operationName || 'Anonymous';
    const timestamp = new Date().toISOString();
    const fieldResolutions: FieldResolutionRecord[] = [];

    return {
      async executionDidStart() {
        return {
          willResolveField({ info }) {
            const start = process.hrtime.bigint();
            return (_error, _result) => {
              const end = process.hrtime.bigint();
              const durationMs = (Number(end - start) / 1000000).toFixed(4);

              fieldResolutions.push({
                timestamp,
                operationName,
                parentType: info.parentType.name,
                fieldName: info.fieldName,
                durationMs,
              });
            };
          },
        };
      },

      async willSendResponse() {
        if (fieldResolutions.length === 0) return;

        // Ensure directory exists
        if (!fs.existsSync(PERF_DATA_DIR)) {
          fs.mkdirSync(PERF_DATA_DIR, { recursive: true });
        }

        const includeHeaders = !fs.existsSync(PERF_FILE);
        const writeStream = fs.createWriteStream(PERF_FILE, { flags: 'a' });

        await new Promise<void>((resolve, reject) => {
          const csvStream = writeToStream(writeStream, fieldResolutions, {
            headers: includeHeaders,
            includeEndRowDelimiter: true,
            writeHeaders: includeHeaders,
          });

          csvStream.on('error', reject);
          csvStream.on('finish', resolve);
        });
      },
    };
  },
};
