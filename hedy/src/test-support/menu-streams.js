import { EventEmitter } from 'node:events'

const collectingStream = (extra) => {
  const stream = Object.assign(new EventEmitter(), { isTTY: true, chunks: [], ...extra })
  stream.write = (chunk, encodingOrDone, done) => {
    stream.chunks.push(chunk)
    const finished = typeof encodingOrDone === 'function' ? encodingOrDone : done
    if (finished !== undefined) finished()
    return true
  }
  stream.text = () => stream.chunks.join('')
  return stream
}

/**
 * Returns a terminal stdout for Ink's render: isTTY true, 100 columns and
 * 40 rows. write keeps every chunk in chunks and returns true, and text()
 * returns the chunks joined.
 *
 * @returns {EventEmitter & { isTTY: true, columns: number, rows: number, chunks: string[], write: (chunk: string) => true, text: () => string }}
 */
export const fakeStdout = () => collectingStream({ columns: 100, rows: 40 })

/**
 * Returns a terminal stderr for Ink's render, the same as fakeStdout without
 * columns and rows.
 *
 * @returns {EventEmitter & { isTTY: true, chunks: string[], write: (chunk: string) => true, text: () => string }}
 */
export const fakeStderr = () => collectingStream({})

/**
 * Returns a terminal stdin for Ink's render: isTTY true, write(data) keeps
 * the data and emits readable then data, read() returns the kept data once
 * and then null, and the raw mode, encoding, flow and ref methods do
 * nothing.
 *
 * @returns {EventEmitter & { isTTY: true, write: (data: string) => void, read: () => string | null }}
 */
export const fakeStdin = () => {
  const stdin = Object.assign(new EventEmitter(), { isTTY: true })
  let pending = null
  stdin.write = (data) => {
    pending = data
    stdin.emit('readable')
    stdin.emit('data', data)
  }
  stdin.read = () => {
    const data = pending
    pending = null
    return data
  }
  for (const name of ['setRawMode', 'setEncoding', 'resume', 'pause', 'ref', 'unref']) stdin[name] = () => {}
  return stdin
}
