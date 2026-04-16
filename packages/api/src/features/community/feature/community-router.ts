import { communityFeatureGetBySlug } from './community-feature-get-by-slug'
import { communityFeatureGetCollectionAsset } from './community-feature-get-collection-asset'
import { communityFeatureList } from './community-feature-list'
import { communityFeatureListCollectionAssets } from './community-feature-list-collection-assets'

export const communityRouter = {
  getBySlug: communityFeatureGetBySlug,
  getCollectionAsset: communityFeatureGetCollectionAsset,
  list: communityFeatureList,
  listCollectionAssets: communityFeatureListCollectionAssets,
}
