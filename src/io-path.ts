import * as PlatformNodePath from '@effect/platform-node/Path';
import { Context } from 'effect';

export const Tag = PlatformNodePath.Path;
export interface Interface extends Context.Tag.Service<typeof Tag> {}

// layerWin32 implements functions that behave similarly on Windows and Linux
// See Node js path doc for more information
export const live = PlatformNodePath.layerWin32;
