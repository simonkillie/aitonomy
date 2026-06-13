#!/usr/bin/env node
import { Command } from 'commander';
import { scan } from './scanner';
import { computeMetrics } from './metrics';
import { mapProfile, getProfileDescription } from './profiles';
import { buildPayload, submitPayload } from './submit';

const program = new Command();

program.name('agentry').description('Measure developer autonomy from agent session data').version('1.0.0');

program
  .command('scan')
  .description('Scan agent sessions and compute autonomy score')
  .option('--submit', 'Submit score to the leaderboard (opt-in only)')
  .option('--handle <name>', 'Handle to display on the leaderboard', 'anonymous')
  .option('--last-n <n>', 'Maximum number of recent sessions to include', '50')
  .option('--days <d>', 'Number of days to look back', '7')
  .action(async (opts: { submit?: boolean; handle: string; lastN: string; days: string }) => {
    try {
      const sessions = await scan({ lastN: parseInt(opts.lastN), days: parseInt(opts.days) });
      const metrics = computeMetrics(sessions);
      const profile = mapProfile(metrics.composite);
      const payload = buildPayload({ metrics, profile, handle: opts.handle });

      console.log('\n=== agentry Autonomy Report ===');
      console.log(`Sessions analysed : ${metrics.sessionCount}`);
      console.log(`Composite Score   : ${metrics.composite.toFixed(1)} / 100`);
      console.log(`Profile           : ${profile}`);
      console.log(`                    ${getProfileDescription(profile)}`);
      console.log('');
      console.log('Axis breakdown:');
      console.log(`  Parallelism      (40%) : ${metrics.parallelism.toFixed(1)}`);
      console.log(`  Delegation Depth (25%) : ${metrics.delegationDepth.toFixed(1)}`);
      console.log(`  Hands-off Ratio  (25%) : ${metrics.handsOffRatio.toFixed(1)}`);
      console.log(`  Run Length       (10%) : ${metrics.runLength.toFixed(1)}`);

      if (opts.submit) {
        console.log('\nSubmitting to leaderboard…');
        const result = await submitPayload(payload);
        console.log('Submitted:', JSON.stringify(result, null, 2));
      } else {
        console.log('\n[dry-run] Would submit the following payload (use --submit to send):');
        console.log(JSON.stringify(payload, null, 2));
        console.log('\nNote: submitting is optional. Your data stays local unless you pass --submit.');
      }
    } catch (err) {
      console.error('Error during scan:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse(process.argv);
