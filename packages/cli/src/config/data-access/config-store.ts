import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import envPaths from 'env-paths'

import { ConfigError, validateApiUrl, validateProfileName } from '../util/config-validation'

export const CONFIG_FILE_NAME = 'config.json'
export const DEFAULT_PROFILE_NAME = 'default'
export const TG_PROFILE_ENV = 'TG_PROFILE'
export const TOKENGATOR_CONFIG_HOME_ENV = 'TOKENGATOR_CONFIG_HOME'

export type TokengatorConfig = {
  activeProfile: string
  profiles: Record<string, TokengatorProfileConfig>
}

export type TokengatorProfileConfig = {
  apiKey?: string
  apiKeyId?: string
  apiKeyName?: string
  apiUrl?: string
  authenticatedAt?: string
  userId?: string
  username?: string
  [key: string]: unknown
}

export type TokengatorAuthCredentials = {
  apiKey?: string
  apiKeyId?: string
  apiKeyName?: string
  apiUrl?: string
  authenticatedAt?: string
  profile: string
  userId?: string
  username?: string
}

export type ProfileSummary = {
  active: string
  apiUrl: string
  profile: string
}

type ConfigPathOptions = {
  env?: NodeJS.ProcessEnv
}

type ConfigStoreOptions = ConfigPathOptions & {
  configPath?: string
}

export type ProfileOptions = ConfigStoreOptions & {
  profile?: string
}

type ProfileSelection = {
  hasProfileOverride: boolean
  profile: string
}

type ResolvedProfile = {
  profile: string
  profileConfig: TokengatorProfileConfig
}

function createEmptyConfig(): TokengatorConfig {
  return {
    activeProfile: DEFAULT_PROFILE_NAME,
    profiles: {},
  }
}

function getConfigDir(options: ConfigPathOptions = {}): string {
  const env = options.env ?? process.env
  const override = env[TOKENGATOR_CONFIG_HOME_ENV]?.trim()

  return override || envPaths('tokengator', { suffix: '' }).config
}

function getResolvedConfigPath(options: ConfigStoreOptions = {}): string {
  return options.configPath ?? getConfigPath(options.env)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getStoredConfigApiUrl(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'string') {
    return undefined
  }

  return value.trim()
}

function getStoredConfigProfileName(name: string): string | undefined {
  const profileName = name.trim()

  return profileName || undefined
}

function getProfileOverride(options: ProfileOptions = {}): string | undefined {
  if (options.profile) {
    return options.profile
  }

  const env = options.env ?? process.env
  const profile = env[TG_PROFILE_ENV]?.trim()

  return profile || undefined
}

function requireProfile(config: TokengatorConfig, profileName: string): TokengatorProfileConfig {
  const profile = config.profiles[profileName]

  if (!profile) {
    throw new ConfigError(`Profile "${profileName}" does not exist.`)
  }

  return profile
}

function selectProfile(config: TokengatorConfig, options: ProfileOptions = {}): ProfileSelection {
  const profileOverride = getProfileOverride(options)

  return {
    hasProfileOverride: Boolean(profileOverride),
    profile: profileOverride ? validateProfileName(profileOverride) : config.activeProfile,
  }
}

function resolveProfile(config: TokengatorConfig, options: ProfileOptions = {}): ResolvedProfile {
  const { profile } = selectProfile(config, options)

  return {
    profile,
    profileConfig: requireProfile(config, profile),
  }
}

function sortProfileConfig(profileConfig: TokengatorProfileConfig): TokengatorProfileConfig {
  return Object.fromEntries(
    Object.entries(profileConfig).sort(([left], [right]) => left.localeCompare(right)),
  ) as TokengatorProfileConfig
}

function sortConfig(config: TokengatorConfig): TokengatorConfig {
  const profiles = Object.fromEntries(
    Object.entries(config.profiles)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([profile, profileConfig]) => [profile, sortProfileConfig(profileConfig)]),
  )

  return {
    activeProfile: config.activeProfile,
    profiles,
  }
}

export function configExists(options: ConfigStoreOptions = {}): boolean {
  return existsSync(getResolvedConfigPath(options))
}

export function createProfile(
  name: string,
  apiUrl: string,
  options: ConfigStoreOptions = {},
): { config: TokengatorConfig; profile: string } {
  const configPath = getResolvedConfigPath(options)
  const config = readConfig(configPath)
  const profile = validateProfileName(name)

  if (config.profiles[profile]) {
    throw new ConfigError(`Profile "${profile}" already exists.`)
  }

  config.profiles[profile] = {
    apiUrl: validateApiUrl(apiUrl),
  }

  if (Object.keys(config.profiles).length === 1) {
    config.activeProfile = profile
  }

  return {
    config: writeConfig(config, configPath),
    profile,
  }
}

export function clearAuthCredentials(options: ProfileOptions = {}): { config: TokengatorConfig; profile: string } {
  const configPath = getResolvedConfigPath(options)
  const config = readConfig(configPath)
  const { profile, profileConfig } = resolveProfile(config, options)
  const nextProfileConfig: TokengatorProfileConfig = { ...profileConfig }

  delete nextProfileConfig.apiKey
  delete nextProfileConfig.apiKeyId
  delete nextProfileConfig.apiKeyName
  delete nextProfileConfig.authenticatedAt
  delete nextProfileConfig.userId
  delete nextProfileConfig.username

  config.profiles[profile] = nextProfileConfig

  return {
    config: writeConfig(config, configPath),
    profile,
  }
}

export function deleteProfile(
  name: string,
  options: ConfigStoreOptions = {},
): { config: TokengatorConfig; profile: string } {
  const configPath = getResolvedConfigPath(options)
  const config = readConfig(configPath)
  const profile = validateProfileName(name)

  requireProfile(config, profile)

  if (config.activeProfile === profile) {
    throw new ConfigError(`Cannot delete active profile "${profile}".`)
  }

  delete config.profiles[profile]

  return {
    config: writeConfig(config, configPath),
    profile,
  }
}

export function getAuthCredentials(options: ProfileOptions = {}): TokengatorAuthCredentials {
  const config = readConfig(getResolvedConfigPath(options))
  const { profile, profileConfig } = resolveProfile(config, options)

  return {
    apiKey: profileConfig.apiKey,
    apiKeyId: profileConfig.apiKeyId,
    apiKeyName: profileConfig.apiKeyName,
    apiUrl: profileConfig.apiUrl,
    authenticatedAt: profileConfig.authenticatedAt,
    profile,
    userId: profileConfig.userId,
    username: profileConfig.username,
  }
}

export function getApiUrl(options: ProfileOptions = {}): string {
  const config = readConfig(getResolvedConfigPath(options))

  if (Object.keys(config.profiles).length === 0) {
    throw new ConfigError('API URL is not set. Run "tokengator config init".')
  }

  const { profile: profileName, profileConfig } = resolveProfile(config, options)

  if (!profileConfig.apiUrl) {
    throw new ConfigError(`API URL is not set for profile "${profileName}".`)
  }

  return profileConfig.apiUrl
}

export function getConfigPath(env?: NodeJS.ProcessEnv): string {
  return join(getConfigDir({ env }), CONFIG_FILE_NAME)
}

export function listProfileSummaries(config: TokengatorConfig): ProfileSummary[] {
  return Object.entries(config.profiles)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([profile, profileConfig]) => ({
      active: profile === config.activeProfile ? 'yes' : '',
      apiUrl: profileConfig.apiUrl ?? '',
      profile,
    }))
}

export function readConfig(configPath: string = getConfigPath()): TokengatorConfig {
  if (!existsSync(configPath)) {
    return createEmptyConfig()
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error'

    throw new ConfigError(`Invalid config file at ${configPath}: ${message}`)
  }

  if (!isRecord(parsed)) {
    throw new ConfigError(`Invalid config file at ${configPath}: expected an object.`)
  }

  const requestedActiveProfile =
    typeof parsed.activeProfile === 'string' && parsed.activeProfile.trim()
      ? parsed.activeProfile.trim()
      : DEFAULT_PROFILE_NAME

  if (!isRecord(parsed.profiles)) {
    throw new ConfigError(`Invalid config file at ${configPath}: expected profiles object.`)
  }

  const profiles: Record<string, TokengatorProfileConfig> = {}

  for (const [profileName, profileConfig] of Object.entries(parsed.profiles)) {
    const profile = getStoredConfigProfileName(profileName)

    if (!profile || !isRecord(profileConfig)) {
      continue
    }

    const apiUrl = getStoredConfigApiUrl(profileConfig.apiUrl)

    if (profileConfig.apiUrl !== undefined && !apiUrl) {
      continue
    }

    const nextProfileConfig: TokengatorProfileConfig = { ...profileConfig }

    if (apiUrl) {
      nextProfileConfig.apiUrl = apiUrl
    }

    profiles[profile] = nextProfileConfig
  }

  const activeProfile =
    requestedActiveProfile && profiles[requestedActiveProfile]
      ? requestedActiveProfile
      : (Object.keys(profiles).sort()[0] ?? DEFAULT_PROFILE_NAME)

  return sortConfig({
    activeProfile,
    profiles,
  })
}

export function setApiUrl(apiUrl: string, options: ProfileOptions = {}): { config: TokengatorConfig; profile: string } {
  const configPath = getResolvedConfigPath(options)
  const config = readConfig(configPath)
  const { hasProfileOverride, profile } = selectProfile(config, options)

  if (hasProfileOverride || Object.keys(config.profiles).length > 0) {
    requireProfile(config, profile)
  }

  config.profiles[profile] = {
    ...config.profiles[profile],
    apiUrl: validateApiUrl(apiUrl),
  }

  return {
    config: writeConfig(config, configPath),
    profile,
  }
}

export function setAuthCredentials(
  credentials: Omit<TokengatorAuthCredentials, 'profile'>,
  options: ProfileOptions = {},
): { config: TokengatorConfig; profile: string } {
  const configPath = getResolvedConfigPath(options)
  const config = readConfig(configPath)
  const { profile, profileConfig } = resolveProfile(config, options)

  config.profiles[profile] = {
    ...profileConfig,
    apiKey: credentials.apiKey ?? profileConfig.apiKey,
    apiKeyId: credentials.apiKeyId ?? profileConfig.apiKeyId,
    apiKeyName: credentials.apiKeyName ?? profileConfig.apiKeyName,
    apiUrl: credentials.apiUrl ?? profileConfig.apiUrl,
    authenticatedAt: credentials.authenticatedAt ?? profileConfig.authenticatedAt,
    userId: credentials.userId ?? profileConfig.userId,
    username: credentials.username ?? profileConfig.username,
  }

  return {
    config: writeConfig(config, configPath),
    profile,
  }
}

export function useProfile(
  name: string,
  options: ConfigStoreOptions = {},
): { config: TokengatorConfig; profile: string } {
  const configPath = getResolvedConfigPath(options)
  const config = readConfig(configPath)
  const profile = validateProfileName(name)

  requireProfile(config, profile)
  config.activeProfile = profile

  return {
    config: writeConfig(config, configPath),
    profile,
  }
}

export function writeConfig(config: TokengatorConfig, configPath: string = getConfigPath()): TokengatorConfig {
  const sortedConfig = sortConfig(config)
  const tempPath = `${configPath}.${process.pid}.tmp`

  mkdirSync(dirname(configPath), { recursive: true })

  try {
    writeFileSync(tempPath, `${JSON.stringify(sortedConfig, null, 2)}\n`, { mode: 0o600 })
    renameSync(tempPath, configPath)
  } catch (error) {
    rmSync(tempPath, { force: true })

    throw error
  }

  return sortedConfig
}
