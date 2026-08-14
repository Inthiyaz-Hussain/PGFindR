// @ts-nocheck
import { ReadableStream, WritableStream, TransformStream } from 'node:stream/web'

if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as any
}
if (typeof globalThis.WritableStream === 'undefined') {
  globalThis.WritableStream = WritableStream as any
}
if (typeof globalThis.TransformStream === 'undefined') {
  globalThis.TransformStream = TransformStream as any
}
