import { type AnalyzeOptions, analyze as doAnalyze } from '../../actions/analyze.js';

export type { AnalyzeOptions } from '../../actions/analyze.js';

export async function analyze(options: AnalyzeOptions): Promise<string> {
  return doAnalyze(options);
}

export default analyze;
