import {
  type ArchiToRulesOptions,
  archiToRules as doArchiToRules,
} from '../../actions/archi-to-rules.js';

export type { ArchiToRulesOptions } from '../../actions/archi-to-rules.js';

export async function archiToRules(options?: ArchiToRulesOptions): Promise<void> {
  return doArchiToRules(options);
}
