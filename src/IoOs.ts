import { Context, Layer } from 'effect';
import { homedir } from 'node:os';

const implementation = () => ({
	/**
	 * Port of Node Js's os.homedir function
	 * @returns
	 */
	homeDir: () => homedir()
});

// type Interface = typeof implementation works but leads to verbose type display
export interface Interface extends Readonly<ReturnType<typeof implementation>> {}

export const Tag = Context.Tag<Interface>(Symbol.for('@mjljm/node-effect-lib/IoOs.ts'));

export const live = Layer.succeed(Tag, implementation());
