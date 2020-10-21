import { VersioningApi } from 'renovate/dist/versioning';
import * as generic from 'renovate/dist/versioning/loose/generic';

const versions = new Map<string, generic.GenericVersion>([
  ['bionic', { release: [18, 4] }],
  ['18.04', { release: [18, 4] }],
  ['focal', { release: [20, 4] }],
  ['20.04', { release: [20, 4] }],
]);

export const id = 'ubuntu';

function parse(version: string): generic.GenericVersion {
  return versions.get(version) as generic.GenericVersion;
}

function compare(version1: string, version2: string): number {
  const parsed1 = parse(version1);
  const parsed2 = parse(version2);
  // istanbul ignore if
  if (!parsed1 || !parsed2) {
    return 1;
  }
  const length = Math.max(parsed1.release.length, parsed2.release.length);
  for (let i = 0; i < length; i += 1) {
    const part1 = parsed1.release[i];
    const part2 = parsed2.release[i];
    // shorter is bigger 2.1 > 2.1.1
    // istanbul ignore if
    if (part1 === undefined) {
      return 1;
    }
    // istanbul ignore if
    if (part2 === undefined) {
      return -1;
    }
    if (part1 !== part2) {
      return part1 - part2;
    }
  }
  return 0;
}

function isCompatible(version: string, range: string): boolean {
  const parsed1 = parse(version);
  const parsed2 = parse(range);
  return parsed1 != null && parsed2 != null;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const api: VersioningApi = {
  ...generic.create({
    parse,
    compare,
  }),
  isCompatible,
};

export default api;
