export interface FileChunk {
  chunk?: any,
  position:number,
  nextChunkSize:number,
  isLast:boolean,
}
