import { communityFeatureGetBySlug } from './community-feature-get-by-slug'
import { communityFeatureList } from './community-feature-list'
import { communityFeatureListCollectionAssets } from './community-feature-list-collection-assets'

export const communityRouter = {
  getBySlug: communityFeatureGetBySlug,
  list: communityFeatureList,
  listCollectionAssets: communityFeatureListCollectionAssets,
}
