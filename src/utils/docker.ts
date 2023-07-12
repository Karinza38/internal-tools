import { docker } from './docker/common';
import log from './logger';
import { ExecError } from './types';
import is from '@sindresorhus/is';
import * as chalk from 'chalk';
import * as delay from 'delay';

export type BuildOptions = {
  image: string;
  imagePrefix: string;
  cache?: string;
  cacheFromTags?: string[];
  cacheToTags?: string[];
  tag?: string;
  tags?: string[];
  dryRun?: boolean;
  buildArgs?: string[];
  platforms?: string[];
  push?: boolean;
};

const errors = [
  'unexpected status: 400 Bad Request',
  ': no response',
  'error writing layer blob',
];

function canRetry(err: ExecError): boolean {
  return errors.some((str) => err.stderr.includes(str));
}

export async function build({
  image,
  imagePrefix,
  cache,
  cacheFromTags,
  cacheToTags,
  tag = 'latest',
  tags,
  dryRun,
  buildArgs,
  platforms,
  push,
}: BuildOptions): Promise<void> {
  const args = ['buildx', 'build', `--tag=${imagePrefix}/${image}:${tag}`];

  if (tags?.length) {
    args.push(...tags.map((tag) => `--tag=${imagePrefix}/${image}:${tag}`));
  }

  if (is.nonEmptyArray(buildArgs)) {
    args.push(...buildArgs.map((b) => `--build-arg=${b}`));
  }

  if (is.string(cache)) {
    const cachePrefix = cache.split('/')[0]?.match(/[.:]/)
      ? ''
      : `${imagePrefix}/`;
    const cacheImage = `${cachePrefix}${cache}:${image.replace(/\//g, '-')}`;
    args.push(`--cache-from=${cacheImage}-${tag}`);

    if (is.nonEmptyArray(cacheFromTags)) {
      for (const ctag of cacheFromTags) {
        args.push(`--cache-from=${cacheImage}-${ctag}`);
      }
    }

    if (!dryRun && push) {
      args.push(`--cache-to=type=registry,ref=${cacheImage}-${tag},mode=max`);
      if (is.nonEmptyArray(cacheToTags)) {
        for (const ctag of cacheToTags) {
          args.push(
            `--cache-to=type=registry,ref=${cacheImage}-${ctag},mode=max`
          );
        }
      }
    }
  }

  if (platforms?.length) {
    args.push(`--platform=${platforms.join(',')}`);
  }

  if (dryRun) {
    log.warn(chalk.yellow('[DRY_RUN]'), chalk.blue('Would push'));
  } else if (push) {
    args.push('--push', '--provenance=false');
  }

  for (let build = 0; ; build++) {
    try {
      await docker(...args, '.');
      break;
    } catch (e) {
      if (e instanceof ExecError && canRetry(e) && build < 2) {
        log.error(chalk.red(`docker build error on try ${build}`), e);
        await delay(5000);
        continue;
      }
      throw e;
    }
  }
}
