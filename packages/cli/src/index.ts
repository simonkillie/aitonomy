#!/usr/bin/env node
import * as os from 'os';
import { Command } from 'commander';
import { scan } from './scanner';
import { computeMetrics } from './metrics';
import { mapProfile, PROFILES } from './profiles';
import { buildPayload, submitPayload } from './submit';
import { Metrics } from './metrics';

const W = 32; // bar width

function bar(value: number, max = 100): string {
  const filled = Math.round((value / max) * W);
  return '█'.repeat(filled) + '░'.repeat(W - filled);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
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
  return `Score is balanced. Weakest axis: ${weakest.label} (${weakest.value.toFixed(0)}) — ${weakest.tip}.`;
}


const program = new Command();

program.name('agentry').description('Measure developer autonomy from agent session data').version('1.0.7');

program
  .command('scan')
  .description('Scan agent sessions and compute autonomy score')
  .option('--submit', 'Submit score to the leaderboard (opt-in only)')
  .option('--handle <name>', 'Name to display on the leaderboard (defaults to OS username)')
  .option('--last-n <n>', 'Cap on sessions returned after the --days filter (each session = one Claude Code/Codex conversation)', '50')
  .option('--days <d>', 'Number of days to look back (--last-n cap applies after this filter)', '7')
  .action(async (opts: { submit?: boolean; handle?: string; lastN: string; days: string }) => {
    try {
      const sessions = await scan({ lastN: parseInt(opts.lastN), days: parseInt(opts.days) });
      const metrics = computeMetrics(sessions);

      const sep = '─'.repeat(48);

      // Zero sessions — show a helpful no-data message instead of a fake 0/100 score
      if (metrics.sessionCount === 0) {
        console.log(`\n${sep}`);
        console.log('  agentry · Autonomy Score');
        console.log(sep);
        console.log('');
        console.log(`  No session logs found in the last ${opts.days} days.`);
        console.log('');
        console.log('  Make sure Claude Code or Codex is installed and you\'ve used it recently.');
        console.log(`  Try: agentry scan --days 30   to look further back.`);
        console.log('');
        console.log(sep);
        console.log('');
        return;
      }

      const profile = mapProfile(metrics.composite);

      const claudeCount = sessions.filter(s => s.source === 'claude').length;
      const codexCount = sessions.filter(s => s.source === 'codex').length;
      let clientType: string;
      if (claudeCount > 0 && codexCount > 0) clientType = 'Mixed';
      else if (codexCount > 0) clientType = 'Codex';
      else clientType = 'Claude Code';

      const handle = opts.handle ?? os.userInfo().username;
      const payload = buildPayload({ metrics, profile, handle, clientType });

      const score = metrics.composite;
      const profileData = PROFILES.find(p => p.name === profile);
      const profileRange = profileData ? `  ${profileData.min}–${profileData.max}` : '';

      console.log(`\n${sep}`);
      console.log('  agentry · Autonomy Score');
      console.log(sep);
      console.log('');
      console.log(`  ${score.toFixed(1)} / 100`);
      console.log(`  ${bar(score)}  ${profile}${profileRange}`);
      console.log('');

      if (profileData) {
        console.log(`  ${profileData.description}.`);
      }
      console.log('');
      console.log(`  ${plural(metrics.sessionCount, 'session')} · ${clientType} · last ${opts.days ?? 7} days`);
      console.log('');
      console.log(sep);
      console.log('  Breakdown  (weight = share of composite score)');
      console.log('');

      const axes = [
        { label: 'Parallelism ', value: metrics.parallelism, weight: '40%', gloss: 'concurrent sessions' },
        { label: 'Delegation  ', value: metrics.delegationDepth, weight: '25%', gloss: 'tool calls per turn' },
        { label: 'Hands-off   ', value: metrics.handsOffRatio, weight: '25%', gloss: 'less typing = higher' },
        { label: 'Run Length  ', value: metrics.runLength, weight: '10%', gloss: 'uninterrupted streak' },
      ];
      for (const axis of axes) {
        console.log(`  ${axis.label}  ${bar(axis.value)}  ${axis.value.toFixed(1).padStart(5)}  ${axis.weight}  ${axis.gloss}`);
      }

      console.log('');
      console.log(`  ${axisInsight(metrics)}`);

      if (codexCount > 0) {
        console.log('');
        console.log('  Note: subagent detection not yet supported for Codex — Delegation may be underreported.');
      }

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
          console.log(`  Submission failed: ${result.message}`);
          console.log('  Try again later or check https://agentry-cli.vercel.app');
        }
      } else {
        console.log('  Share your score (optional):');
        console.log('');
        console.log(`  agentry scan --submit`);
        console.log(`  npx agentry-cli scan --submit`);
        console.log('');
        console.log('  https://agentry-cli.vercel.app');
        console.log('');
        console.log('  Dry run — nothing leaves your machine without --submit.');
      }

      console.log(sep);
      console.log('');

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('EACCES') || msg.includes('permission denied')) {
        console.error('Error: Cannot read session files. Check permissions on ~/.claude/projects and ~/.codex/');
      } else if (msg.includes('ENOENT')) {
        console.error('Error: Session directory not found. Make sure Claude Code or Codex is installed and you have run at least one session.');
      } else {
        console.error(`Error: ${msg}`);
        console.error('Tip: try --days 30 to look further back, or check your session log directories.');
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
