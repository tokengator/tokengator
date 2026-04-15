import { adminAssetGroupFeatureCreate } from './admin-asset-group-feature-create'
import { adminAssetGroupFeatureDelete } from './admin-asset-group-feature-delete'
import { adminAssetGroupFeatureGet } from './admin-asset-group-feature-get'
import { adminAssetGroupFeatureIndex } from './admin-asset-group-feature-index'
import { adminAssetGroupFeatureList } from './admin-asset-group-feature-list'
import { adminAssetGroupFeatureListIndexRuns } from './admin-asset-group-feature-list-index-runs'
import { adminAssetGroupFeatureLookup } from './admin-asset-group-feature-lookup'
import { adminAssetGroupFeatureUpdate } from './admin-asset-group-feature-update'

export const adminAssetGroupRouter = {
  create: adminAssetGroupFeatureCreate,
  delete: adminAssetGroupFeatureDelete,
  get: adminAssetGroupFeatureGet,
  index: adminAssetGroupFeatureIndex,
  list: adminAssetGroupFeatureList,
  listIndexRuns: adminAssetGroupFeatureListIndexRuns,
  lookup: adminAssetGroupFeatureLookup,
  update: adminAssetGroupFeatureUpdate,
}
