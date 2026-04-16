import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminAssetGroupUiForm } from '../src/features/admin-asset/ui/admin-asset-group-ui-form'

describe('AdminAssetGroupUiForm', () => {
  test('renders decimals and symbol fields in the asset group details form', () => {
    const markup = renderToStaticMarkup(
      <AdminAssetGroupUiForm
        initialValues={{
          address: 'mint-acme',
          decimals: 6,
          enabled: true,
          imageUrl: 'https://example.com/mint-acme.png',
          label: 'Acme Mint',
          symbol: 'ACME',
          type: 'mint',
        }}
        isPending={false}
        onSubmit={() => {}}
        submitLabel="Save Changes"
      />,
    )

    expect(markup).toContain('Decimals')
    expect(markup).toContain('Symbol')
    expect(markup).toContain('value="6"')
    expect(markup).toContain('value="ACME"')
  })
})
