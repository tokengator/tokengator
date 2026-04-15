import { adminProcedure } from '../../../lib/procedures'

import { devEchoInputSchema } from '../data-access/dev-echo-input-schema'

export const devFeatureEcho = adminProcedure.input(devEchoInputSchema).handler(({ input }) => {
  return {
    reply: `Dev router received: ${input.text}`,
    text: input.text,
  }
})
