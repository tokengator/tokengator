import type { CommunityCollectionOwnerCandidateEntity } from '@tokengator/sdk'

import { ellipsify } from '@wallet-ui/react'
import { UserRoundIcon, WalletIcon } from 'lucide-react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from '@tokengator/ui/components/combobox'

interface CommunityUiCollectionOwnerComboboxProps {
  candidates: CommunityCollectionOwnerCandidateEntity[]
  committedValue: string
  draftValue: string
  id: string
  isOpen: boolean
  isPending: boolean
  onDraftValueChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onValueCommit: (value: string) => void
}

function getCommunityCollectionOwnerCandidateSearchLabel(candidate: CommunityCollectionOwnerCandidateEntity) {
  return candidate.kind === 'user'
    ? `${candidate.value} ${candidate.name}`
    : `${candidate.value} ${candidate.username ?? ''} ${candidate.name}`
}

function getCommunityCollectionUserCandidates(candidates: CommunityCollectionOwnerCandidateEntity[]) {
  return candidates.filter((candidate) => candidate.kind === 'user')
}

function getCommunityCollectionWalletCandidates(candidates: CommunityCollectionOwnerCandidateEntity[]) {
  return candidates.filter((candidate) => candidate.kind === 'wallet')
}

function CommunityUiCollectionOwnerUserItem({ candidate }: { candidate: CommunityCollectionOwnerCandidateEntity }) {
  return (
    <ComboboxItem className="items-center py-2 pr-8" value={candidate}>
      <UserRoundIcon className="text-muted-foreground size-4" />
      <div className="grid min-w-0 gap-0.5">
        <span className="truncate text-sm font-medium">@{candidate.username ?? candidate.value}</span>
        <span className="text-muted-foreground truncate text-xs">{candidate.name}</span>
      </div>
    </ComboboxItem>
  )
}

function CommunityUiCollectionOwnerWalletItem({ candidate }: { candidate: CommunityCollectionOwnerCandidateEntity }) {
  return (
    <ComboboxItem className="items-center py-2 pr-8" value={candidate}>
      <WalletIcon className="text-muted-foreground size-4" />
      <div className="grid min-w-0 gap-0.5">
        <span className="truncate font-mono text-xs" title={candidate.address ?? undefined}>
          {candidate.address ? ellipsify(candidate.address) : ''}
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {candidate.username ? `@${candidate.username} · ${candidate.name}` : candidate.name}
        </span>
      </div>
    </ComboboxItem>
  )
}

export function CommunityUiCollectionOwnerCombobox(props: CommunityUiCollectionOwnerComboboxProps) {
  const {
    candidates,
    committedValue,
    draftValue,
    id,
    isOpen,
    isPending,
    onDraftValueChange,
    onOpenChange,
    onValueCommit,
  } = props
  const selectedCandidate = candidates.find((candidate) => candidate.value === committedValue) ?? null
  const userCandidates = getCommunityCollectionUserCandidates(candidates)
  const walletCandidates = getCommunityCollectionWalletCandidates(candidates)

  return (
    <Combobox
      autoHighlight
      inputValue={draftValue}
      items={candidates}
      itemToStringLabel={getCommunityCollectionOwnerCandidateSearchLabel}
      itemToStringValue={(candidate) => candidate.value}
      onInputValueChange={onDraftValueChange}
      onOpenChange={onOpenChange}
      onValueChange={(candidate) => {
        if (candidate) {
          onValueCommit(candidate.value)
        }
      }}
      open={isOpen}
      value={selectedCandidate}
    >
      <ComboboxInput id={id} placeholder="Search by username or wallet address" showClear />
      <ComboboxContent>
        <ComboboxEmpty>
          {isPending ? 'Searching users and wallets...' : 'No users or wallet addresses found.'}
        </ComboboxEmpty>
        <ComboboxList>
          {userCandidates.length > 0 ? (
            <ComboboxGroup>
              <ComboboxLabel>Users</ComboboxLabel>
              {userCandidates.map((candidate) => (
                <CommunityUiCollectionOwnerUserItem candidate={candidate} key={`user:${candidate.id}`} />
              ))}
            </ComboboxGroup>
          ) : null}
          {walletCandidates.length > 0 ? (
            <ComboboxGroup>
              <ComboboxLabel>Wallets</ComboboxLabel>
              {walletCandidates.map((candidate) => (
                <CommunityUiCollectionOwnerWalletItem candidate={candidate} key={`wallet:${candidate.id}`} />
              ))}
            </ComboboxGroup>
          ) : null}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
