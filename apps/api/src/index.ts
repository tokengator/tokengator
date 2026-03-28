import { createApiApp } from '@tokengator/api/app'

const app = createApiApp()

app.get('/', (c) => {
  return c.text('OK')
})

export default app
