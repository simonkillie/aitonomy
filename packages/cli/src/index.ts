#!/usr/bin/env node
import * as os from 'os';
import { Command } from 'commander';
import { scan } from './scanner';
import { computeMetrics } from './metrics';
import { mapProfile, PROFILES, Profile } from './profiles';
import { buildPayload, submitPayload } from './submit';
import { Metrics } from './metrics';

const W = 32; // bar width

function bar(value: number, max = 100): string {
  const filled = Math.round((value / max) * W);
  return '█'.repeat(filled) + '░'.repeat(W - filled);
}

function axisInsight(metrics: Metrics): string {
  const axes = [
    { label: 'Parallelism', value: metrics.parallelism, tip: 'run concurrent sessions to push this up' },
    { label: 'Delegation depth', value: metrics.delegationDepth, tip: 'let your agent make more decisions before you check in' },
    { label: 'Hands-off ratio', value: metrics.handsOffRatio, tip: 'type less, delegate more per session' },
    { label: 'Run length', value: metrics.runLength, tip: 'let agent streaks run longer without interrupting' },
  ];
  const sorted = [...axes].sort((a, b) => b.value - a.value);
  const weakest = sorted[sorted.length - 1];
  const strongest = sorted[0];
  if (weakest.value < 20) {
    return `Biggest gap: ${weakest.label} (${weakest.value.toFixed(0)}) — ${weakest.tip}.`;
  }
  if (strongest.value > 70) {
    return `${strongest.label} is your strongest signal — build on it.`;
  }
  return `Score is balanced. Delegate larger tasks end-to-end to push higher.`;
}


const program = new Command();

program.name('agentry').description('Measure developer autonomy from agent session data').version('1.0.2');

program
  .command('scan')
  .description('Scan agent sessions and compute autonomy score')
  .option('--submit', 'Submit score to the leaderboard (opt-in only)')
  .option('--handle <name>', 'Name to display on the leaderboard (defaults to OS username)')
  .option('--last-n <n>', 'Maximum number of recent sessions to include', '50')
  .option('--days <d>', 'Number of days to look back', '7')
  .action(async (opts: { submit?: boolean; handle?: string; lastN: string; days: string }) => {
    try {
      const sessions = await scan({ lastN: parseInt(opts.lastN), days: parseInt(opts.days) });
      const metrics = computeMetrics(sessions);
      const profile = mapProfile(metrics.composite);

      const claudeCount = sessions.filter(s => s.source === 'claude').length;
      const codexCount = sessions.filter(s => s.source === 'codex').length;
      let clientType: string;
      if (claudeCount > 0 && codexCount > 0) clientType = 'Mixed';
      else if (codexCount > 0) clientType = 'Codex';
      else clientType = 'Claude Code';

      const handle = opts.handle ?? os.userInfo().username;
      const payload = buildPayload({ metrics, profile, handle, clientType });

      const sep = '─'.repeat(48);
      const score = metrics.composite;

      console.log(`\n${sep}`);
      console.log('  agentry · Autonomy Score');
      console.log(sep);
      console.log('');
      console.log(`  ${score.toFixed(1)} / 100`);
      console.log(`  ${bar(score)}  ${profile}`);
      console.log('');

      const profileData = PROFILES.find(p => p.name === profile);
      if (profileData) {
        console.log(`  ${profileData.description}.`);
      }
      console.log('');
      console.log(`  ${metrics.sessionCount} sessions · ${clientType} · last ${opts.days ?? 7} days`);
      console.log('');
      console.log(sep);
      console.log('  Breakdown');
      console.log('');

      const axes = [
        { label: 'Parallelism ', value: metrics.parallelism, weight: '40%' },
        { label: 'Delegation  ', value: metrics.delegationDepth, weight: '25%' },
        { label: 'Hands-off   ', value: metrics.handsOffRatio, weight: '25%' },
        { label: 'Run Length  ', value: metrics.runLength, weight: '10%' },
      ];
      for (const axis of axes) {
        console.log(`  ${axis.label}  ${bar(axis.value)}  ${axis.value.toFixed(1).padStart(5)}  ${axis.weight}`);
      }

      console.log('');
      console.log(`  ${axisInsight(metrics)}`);
      console.log('');
      console.log(sep);

      if (opts.submit) {
        console.log(`  Posting to leaderboard as "${handle}"…`);
        console.log('');
        const result = await submitPayload(payload);
        if (result.ok) {
          console.log('  Done. See the leaderboard:');
          console.log('  https://agentry-cli.vercel.app');
        } else {
          console.log('  Submission failed. Try again later.');
        }
      } else {
        console.log('  Share your score (optional):');
        console.log('');
        console.log(`  agentry scan --submit`);
        console.log(`  npx agentry-cli scan --submit`);
        console.log('');
        console.log('  https://agentry-cli.vercel.app');
        console.log('');
        console.log('  Nothing leaves your machine without --submit.');
      }

      console.log(sep);
      console.log('');

    } catch (err) {
      console.error('Error during scan:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse(process.argv);
