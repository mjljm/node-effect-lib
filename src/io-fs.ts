import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import { Context } from 'effect';

export const Tag = PlatformNodeFs.FileSystem;
export interface Interface extends Context.Tag.Service<typeof Tag> {}

export const live = PlatformNodeFs.layer;
