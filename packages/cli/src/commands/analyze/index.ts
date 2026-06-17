import { type AnalyzeOptions, analyze as doAnalyze } from '../../actions/analyze';

export type { AnalyzeOptions } from '../../actions/analyze';

export async function analyze(options: AnalyzeOptions): Promise<string> {
  return doAnalyze(options);
}
