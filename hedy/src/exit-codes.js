export const EXIT = Object.freeze({ OK: 0, ERROR: 1, USAGE: 2 })

/**
 * Maps an error code to the process exit code: USAGE exits 2, every other code exits 1.
 */
export const exitCodeFor = (code) => code === 'USAGE' ? EXIT.USAGE : EXIT.ERROR
