import { communityFeatureGetBySlug } from './community-feature-get-by-slug'
import { communityFeatureList } from './community-feature-list'

export const communityRouter = {
  getBySlug: communityFeatureGetBySlug,
  list: communityFeatureList,
}
