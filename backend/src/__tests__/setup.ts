// Setup global do Vitest. O backend nao usa decorators/TypeORM, entao
// 'reflect-metadata' nao e necessario (removido: quebrava o CI por nao estar
// nas dependencias). Mantido como ponto de extensao para setup futuro.
export {};
