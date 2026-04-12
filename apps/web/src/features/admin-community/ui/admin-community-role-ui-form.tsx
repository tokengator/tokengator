import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { AdminCommunityRoleInput } from '@tokengator/sdk'
import { Button } from '@tokengator/ui/components/button'
import { Checkbox } from '@tokengator/ui/components/checkbox'
import { Input } from '@tokengator/ui/components/input'
import { Label } from '@tokengator/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tokengator/ui/components/select'
import { slugify } from '@tokengator/ui/util/slugify'

export interface AdminCommunityRoleUiAssetGroupOption {
  enabled: boolean
  id: string
  label: string
  type: 'collection' | 'mint'
}

export interface AdminCommunityRoleUiFormValues {
  conditions: Array<{
    assetGroupId: string
    maximumAmount: string
    minimumAmount: string
  }>
  enabled: boolean
  matchMode: 'all' | 'any'
  name: string
  slug: string
}

function hasValidConditionRange(condition: AdminCommunityRoleUiFormValues['conditions'][number]) {
  if (!condition.assetGroupId || !/^[1-9]\d*$/.test(condition.minimumAmount)) {
    return false
  }

  if (!condition.maximumAmount) {
    return true
  }

  return (
    /^[1-9]\d*$/.test(condition.maximumAmount) && BigInt(condition.maximumAmount) >= BigInt(condition.minimumAmount)
  )
}

function createAdminCommunityRoleUiConditionValue() {
  return {
    assetGroupId: '',
    maximumAmount: '',
    minimumAmount: '1',
  }
}

function getAdminCommunityRoleUiConditionKeys(count: number) {
  return Array.from({ length: count }, (_, index) => `condition-${index}`)
}

export function getAdminCommunityRoleUiDefaultValues(): AdminCommunityRoleUiFormValues {
  return {
    conditions: [createAdminCommunityRoleUiConditionValue()],
    enabled: true,
    matchMode: 'any',
    name: '',
    slug: '',
  }
}

interface AdminCommunityRoleUiFormProps {
  assetGroupOptions: AdminCommunityRoleUiAssetGroupOption[]
  initialValues: AdminCommunityRoleUiFormValues
  isPending: boolean
  onSubmit: (values: AdminCommunityRoleInput) => void
  submitLabel: string
}

const unselectedAssetGroupValue = '__select-asset-group__'
const matchModeItems = [
  {
    label: 'ALL',
    value: 'all',
  },
  {
    label: 'ANY',
    value: 'any',
  },
] as const

export function AdminCommunityRoleUiForm(props: AdminCommunityRoleUiFormProps) {
  const { assetGroupOptions, initialValues, isPending, onSubmit, submitLabel } = props
  const nextConditionKeyRef = useRef(initialValues.conditions.length)
  const [conditionKeys, setConditionKeys] = useState(() =>
    getAdminCommunityRoleUiConditionKeys(initialValues.conditions.length),
  )
  const [values, setValues] = useState(initialValues)
  const assetGroupItems = [
    {
      disabled: false,
      label: 'Select an asset group',
      value: unselectedAssetGroupValue,
    },
    ...assetGroupOptions.map((assetGroup) => ({
      disabled: !assetGroup.enabled,
      label: `${assetGroup.label} (${assetGroup.type}${assetGroup.enabled ? '' : ', disabled'})`,
      value: assetGroup.id,
    })),
  ]

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()

        const nextValues: AdminCommunityRoleInput = {
          ...values,
          conditions: values.conditions
            .map((condition) => ({
              assetGroupId: condition.assetGroupId,
              maximumAmount: condition.maximumAmount.trim() || null,
              minimumAmount: condition.minimumAmount.trim() || '1',
            }))
            .filter((condition) => condition.assetGroupId),
          name: values.name.trim(),
          slug: values.slug.trim() || slugify(values.name),
        }

        onSubmit(nextValues)
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="community-role-name">Name</Label>
        <Input
          id="community-role-name"
          onBlur={() =>
            setValues((currentValues) => {
              if (currentValues.slug.trim()) {
                return currentValues
              }

              return {
                ...currentValues,
                slug: slugify(currentValues.name),
              }
            })
          }
          onChange={(event) =>
            setValues((currentValues) => ({
              ...currentValues,
              name: event.target.value,
            }))
          }
          placeholder="Collectors"
          required
          value={values.name}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="community-role-slug">Slug</Label>
        <Input
          id="community-role-slug"
          onChange={(event) =>
            setValues((currentValues) => ({
              ...currentValues,
              slug: event.target.value,
            }))
          }
          placeholder="collectors"
          required
          value={values.slug}
        />
      </div>
      <div className="grid gap-1.5">
        <Label id="community-role-match-mode-label">Match Mode</Label>
        <Select
          disabled={isPending}
          items={matchModeItems}
          onValueChange={(value) => {
            if (value === null) {
              return
            }

            setValues((currentValues) => ({
              ...currentValues,
              matchMode: value as AdminCommunityRoleUiFormValues['matchMode'],
            }))
          }}
          value={values.matchMode}
        >
          <SelectTrigger
            aria-labelledby="community-role-match-mode-label"
            className="w-full"
            id="community-role-match-mode"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {matchModeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={values.enabled}
          id="community-role-enabled"
          onCheckedChange={(checked) =>
            setValues((currentValues) => ({
              ...currentValues,
              enabled: Boolean(checked),
            }))
          }
        />
        <Label htmlFor="community-role-enabled">Enabled</Label>
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Conditions</Label>
          <Button
            onClick={() => {
              setConditionKeys((currentConditionKeys) => [
                ...currentConditionKeys,
                `condition-${nextConditionKeyRef.current++}`,
              ])
              setValues((currentValues) => ({
                ...currentValues,
                conditions: [...currentValues.conditions, createAdminCommunityRoleUiConditionValue()],
              }))
            }}
            type="button"
            variant="outline"
          >
            Add Condition
          </Button>
        </div>
        {values.conditions.map((condition, conditionIndex) => (
          <div className="grid gap-3 border p-3" key={conditionKeys[conditionIndex] ?? `condition-${conditionIndex}`}>
            <div className="grid gap-1.5">
              <Label id={`community-role-condition-asset-group-${conditionIndex}-label`}>Asset Group</Label>
              <Select
                disabled={isPending}
                items={assetGroupItems}
                onValueChange={(value) => {
                  if (value === null) {
                    return
                  }

                  setValues((currentValues) => ({
                    ...currentValues,
                    conditions: currentValues.conditions.map((currentCondition, currentConditionIndex) =>
                      currentConditionIndex === conditionIndex
                        ? {
                            ...currentCondition,
                            assetGroupId: value === unselectedAssetGroupValue ? '' : value,
                          }
                        : currentCondition,
                    ),
                  }))
                }}
                required
                value={condition.assetGroupId || unselectedAssetGroupValue}
              >
                <SelectTrigger
                  aria-labelledby={`community-role-condition-asset-group-${conditionIndex}-label`}
                  className="w-full"
                  id={`community-role-condition-asset-group-${conditionIndex}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetGroupItems.map((item) => (
                    <SelectItem disabled={item.disabled} key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`community-role-condition-minimum-amount-${conditionIndex}`}>Minimum Amount</Label>
              <Input
                id={`community-role-condition-minimum-amount-${conditionIndex}`}
                inputMode="numeric"
                onChange={(event) =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    conditions: currentValues.conditions.map((currentCondition, currentConditionIndex) =>
                      currentConditionIndex === conditionIndex
                        ? {
                            ...currentCondition,
                            minimumAmount: event.target.value.replace(/[^0-9]/g, ''),
                          }
                        : currentCondition,
                    ),
                  }))
                }
                placeholder="1"
                required
                value={condition.minimumAmount}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`community-role-condition-maximum-amount-${conditionIndex}`}>Maximum Amount</Label>
              <Input
                id={`community-role-condition-maximum-amount-${conditionIndex}`}
                inputMode="numeric"
                onChange={(event) =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    conditions: currentValues.conditions.map((currentCondition, currentConditionIndex) =>
                      currentConditionIndex === conditionIndex
                        ? {
                            ...currentCondition,
                            maximumAmount: event.target.value.replace(/[^0-9]/g, ''),
                          }
                        : currentCondition,
                    ),
                  }))
                }
                placeholder="Optional"
                value={condition.maximumAmount}
              />
            </div>
            {condition.maximumAmount && !hasValidConditionRange(condition) ? (
              <div className="text-destructive text-xs">
                Maximum amount must be greater than or equal to minimum amount.
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button
                disabled={values.conditions.length === 1}
                onClick={() => {
                  setConditionKeys((currentConditionKeys) =>
                    currentConditionKeys.filter((_, currentConditionIndex) => currentConditionIndex !== conditionIndex),
                  )
                  setValues((currentValues) => ({
                    ...currentValues,
                    conditions: currentValues.conditions.filter(
                      (_, currentConditionIndex) => currentConditionIndex !== conditionIndex,
                    ),
                  }))
                }}
                type="button"
                variant="outline"
              >
                Remove Condition
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button
          disabled={isPending || !values.name.trim() || !values.conditions.every(hasValidConditionRange)}
          type="submit"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}
