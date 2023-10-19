import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import type * as NodeFS from 'node:fs';
import { readdir, watch } from 'node:fs/promises';

export class IoFsError extends Data.TaggedError('IoFsError')<{
	message: string;
}> {}

const implementation = {
	/**
	 * Port of Node js fsPromises.watch function - Only the function that returns FileChangeInfo<string>'s has been ported.
	 * @param filename The file or directory to watch
	 * @param options See Node js's WatchOptions.
	 * @returns
	 */
	watch: (filename: string, options?: NodeFS.WatchOptions | BufferEncoding) =>
		Stream.fromAsyncIterable(
			watch(filename, options),
			(e) => new IoFsError({ message: `watch: ${(e as Error).message}` })
		),
	/**
	 * Port of Node js fsPromises.readdir function - Only the function that returns Dirent's has been ported.
	 * @param path The path to the directory to read
	 * @param options See Node js's ObjectEncodingOptions. Set recursive to true to read subdirectories recursively. False if not supplied.
	 * @returns
	 */
	readDir: (
		path: string,
		options: NodeFS.ObjectEncodingOptions & {
			recursive?: boolean | undefined;
		}
	) =>
		Effect.tryPromise({
			try: () => readdir(path, { ...options, withFileTypes: true }),
			catch: (e) => new IoFsError({ message: `readDir: ${(e as Error).message}` })
		})
};

export type Interface = typeof implementation;

export const Tag = Context.Tag<Interface>(Symbol.for('@mjljm/node-effect-lib/io-fs.ts'));

export const live = Layer.succeed(Tag, implementation);
