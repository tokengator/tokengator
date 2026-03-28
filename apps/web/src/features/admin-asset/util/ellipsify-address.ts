const ellipsisLength = 3
const prefixLength = 6
const suffixLength = 6

export function ellipsifyAddress(address: string) {
  const trimmedAddress = address.trim()

  if (!trimmedAddress) {
    return ''
  }

  if (trimmedAddress.length <= prefixLength + suffixLength + ellipsisLength) {
    return trimmedAddress
  }

  return `${trimmedAddress.slice(0, prefixLength)}...${trimmedAddress.slice(-suffixLength)}`
}
