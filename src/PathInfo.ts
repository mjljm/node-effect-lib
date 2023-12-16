import * as FileSystem from '@effect/platform/FileSystem';
import { Data, Equal, Hash, Order } from 'effect';

export class Type extends Data.Class<{
	/**
	 * Absolute path to the file or directory (relative paths are converted to absolute paths but symlinks are not resolved)
	 */
	readonly absolutePath: string;
	/**
	 * Real absolute path to the file or directory (symLinks and relative paths are converted to absolute paths). Symlinks are only transformed if resolveSymLinks=true
	 */
	readonly realAbsolutePath: string;
	/**
	 * Name of the file (with its extension) or directory
	 */
	readonly basename: string;
	/**
	 * Real absolute path of the directory that contains the file. No trailing separator
	 */
	readonly dirPath: string;
	/**
	 * Data regarding this file as returned by fs.stat
	 */
	readonly stat: FileSystem.File.Info;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean =>
		that instanceof Type
			? Equal.equals(this.realAbsolutePath, that.realAbsolutePath)
			: false;
	[Hash.symbol] = (): number => Hash.hash(this.realAbsolutePath);
}

export const byAbsolutePath = Order.mapInput(
	Order.string,
	(f: Type) => f.absolutePath
);
export const byRealAbsolutePath = Order.mapInput(
	Order.string,
	(f: Type) => f.realAbsolutePath
);
export const byBasename = Order.mapInput(Order.string, (f: Type) => f.basename);
