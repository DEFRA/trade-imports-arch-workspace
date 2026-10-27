export const EXIT = Object.freeze({ OK: 0, ERROR: 1, USAGE: 2 })

/**
 * Maps an error code to the process exit code: USAGE exits 2, every other code exits 1.
 */
export const exitCodeFor = (code) => code === 'USAGE' ? EXIT.USAGE : EXIT.ERROR

/**
 * The lowest exitCodeFor among one or more error codes.
 *
 * @param {string[]} codes one or more error codes
 */
export const exitCodeForAll = (codes) => Math.min(...codes.map((code) => exitCodeFor(code)))
