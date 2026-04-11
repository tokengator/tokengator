export function getApiPort() {
  return Number(process.env.API_PORT ?? process.env.PORT ?? 3000)
}
