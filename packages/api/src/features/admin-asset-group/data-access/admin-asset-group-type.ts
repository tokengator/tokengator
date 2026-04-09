import z from 'zod'

export const adminAssetGroupTypeSchema = z.enum(['collection', 'mint'])

export type AdminAssetGroupType = z.infer<typeof adminAssetGroupTypeSchema>
