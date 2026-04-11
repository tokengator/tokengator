/**
Prompt for a new chat:

Use the existing PageSpeed CLI wrapper in this repo to identify what to build next from PSI output.

Run this command first and treat its output as the source of truth:
PAGESPEED_API_KEY="$(cat tmp/pagespeed-api-key)" bun run ./scripts/pagespeed.ts https://dev.tokengator.app

Then:
1. Extract the actionable items from the command output.
2. Group them by category: accessibility, best-practices, performance, seo.
3. Rank them by highest user impact, easiest to fix first, and likely score improvement.
4. Turn that into a concrete implementation queue for this repo.
5. Start implementing the top-priority fixes.

Constraints:
- Keep scope strict to apps/web unless a fix clearly requires something else. If it does, stop and ask.
- Use minimal diffs. No refactors unless required for the fix.
- Do not edit docs, lockfiles, or unrelated packages.
- After each meaningful change, rerun the same PageSpeed command and compare the actionable items and scores.

Output format:
- The raw actionable items found from PSI
- A short prioritized fix list
- Actual implementation work
- Updated PSI results after rerunning the command
*/
const API_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const CATEGORIES = ['accessibility', 'best-practices', 'performance', 'seo'] as const
const DEFAULT_STRATEGY = 'mobile'
const HELP_FLAGS = new Set(['--help', '-h'])
const JSON_FLAG = '--json'
const STRATEGY_FLAG = '--strategy'
const VALID_STRATEGIES = new Set(['desktop', 'mobile'])

type Category = (typeof CATEGORIES)[number]
type Strategy = 'desktop' | 'mobile'

type PsiApiError = {
  code?: number
  errors?: Array<{
    domain?: string
    message?: string
    reason?: string
  }>
  message?: string
  status?: string
}

type PsiAudit = {
  description?: string
  details?: {
    overallSavingsMs?: number
    type?: string
  }
  displayValue?: string
  explanation?: string
  id?: string
  score?: number | null
  scoreDisplayMode?: string
  title?: string
}

type PsiCategory = {
  auditRefs?: Array<{
    id: string
  }>
  score?: number | null
  title?: string
}

type PsiLoadingExperience = {
  id?: string
  metrics?: Record<string, PsiLoadingMetric>
  overall_category?: string
}

type PsiLoadingMetric = {
  category?: string
  percentile?: number
}

type PsiLighthouseResult = {
  audits?: Record<string, PsiAudit>
  categories?: Partial<Record<Category, PsiCategory>>
  configSettings?: {
    emulatedFormFactor?: string
  }
  fetchTime?: string
  finalUrl?: string
  requestedUrl?: string
  runWarnings?: string[]
  runtimeError?: {
    code?: string
    message?: string
  }
}

type PsiResponse = {
  error?: PsiApiError
  lighthouseResult?: PsiLighthouseResult
  loadingExperience?: PsiLoadingExperience
  originLoadingExperience?: PsiLoadingExperience
}

type ParsedArguments = {
  json: boolean
  strategy: Strategy
  url: string
}

type Opportunity = {
  displayValue: string
  id: string
  savingsMs: number
  title: string
}

type ActionableAudit = {
  category: Category
  displayValue: string | null
  id: string
  score: number
  title: string
}

const FIELD_METRIC_LABELS: Record<string, string> = {
  CUMULATIVE_LAYOUT_SHIFT_SCORE: 'Cumulative Layout Shift',
  EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT: 'Interaction to Next Paint',
  FIRST_CONTENTFUL_PAINT_MS: 'First Contentful Paint',
  FIRST_INPUT_DELAY_MS: 'First Input Delay',
  INTERACTION_TO_NEXT_PAINT: 'Interaction to Next Paint',
  LARGEST_CONTENTFUL_PAINT_MS: 'Largest Contentful Paint',
}
const NON_ACTIONABLE_SCORE_DISPLAY_MODES = new Set(['error', 'informative', 'manual', 'notApplicable'])

function exitWithError(message: string) {
  console.error(message)
  process.exit(1)
}

function printUsage() {
  console.log(
    [
      'Usage:',
      '  bun run ./scripts/pagespeed.ts <url> [--strategy mobile|desktop] [--json]',
      '',
      'Options:',
      `  ${JSON_FLAG}                 Print the raw PageSpeed Insights response JSON.`,
      `  ${STRATEGY_FLAG} <value>    Analysis strategy to use. Defaults to ${DEFAULT_STRATEGY}.`,
      '  --help, -h              Show this usage information.',
      '',
      'Environment:',
      '  PAGESPEED_API_KEY       Required Google PageSpeed Insights API key.',
      '',
      'Examples:',
      '  PAGESPEED_API_KEY=... bun run ./scripts/pagespeed.ts https://tokengator.app',
      '  PAGESPEED_API_KEY=... bun run ./scripts/pagespeed.ts https://dev.tokengator.app',
      '  PAGESPEED_API_KEY=... bun run ./scripts/pagespeed.ts https://tokengator.app --strategy desktop --json',
    ].join('\n'),
  )
}

function parseArguments(argv: string[]): ParsedArguments {
  let json = false
  let strategy: Strategy = DEFAULT_STRATEGY
  let url: string | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (!argument) {
      continue
    }

    if (HELP_FLAGS.has(argument)) {
      printUsage()
      process.exit(0)
    }

    if (argument === JSON_FLAG) {
      json = true
      continue
    }

    if (argument === STRATEGY_FLAG) {
      const nextArgument = argv[index + 1]

      if (!nextArgument) {
        exitWithError(`Missing value for ${STRATEGY_FLAG}.\n`)
      }

      if (!VALID_STRATEGIES.has(nextArgument)) {
        exitWithError(`Invalid strategy "${nextArgument}". Expected "mobile" or "desktop".`)
      }

      strategy = nextArgument as Strategy
      index += 1
      continue
    }

    if (argument.startsWith(`${STRATEGY_FLAG}=`)) {
      const [, value = ''] = argument.split('=', 2)

      if (!VALID_STRATEGIES.has(value)) {
        exitWithError(`Invalid strategy "${value}". Expected "mobile" or "desktop".`)
      }

      strategy = value as Strategy
      continue
    }

    if (argument.startsWith('-')) {
      exitWithError(`Unknown option "${argument}".`)
    }

    if (url) {
      exitWithError(`Unexpected extra argument "${argument}".`)
    }

    url = normalizeUrl(argument)
  }

  if (!url) {
    printUsage()
    process.exit(1)
  }

  return {
    json,
    strategy,
    url,
  }
}

function normalizeCategory(category: string | undefined) {
  return category ? category.toLowerCase().replaceAll('_', ' ') : 'unknown'
}

function normalizeUrl(input: string) {
  let url: URL

  try {
    url = new URL(input)
  } catch {
    exitWithError(`Invalid URL "${input}". Provide a full http(s) URL.`)
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    exitWithError(`Unsupported URL protocol "${url.protocol}". Use http or https.`)
  }

  return url.toString()
}

function formatMilliseconds(milliseconds: number) {
  if (milliseconds >= 1_000) {
    return `${(milliseconds / 1_000).toFixed(1).replace(/\.0$/, '')} s`
  }

  return `${Math.round(milliseconds)} ms`
}

function formatNumeric(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)
}

function formatScore(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return 'n/a'
  }

  return `${Math.round(score * 100)}`
}

function formatAuditContext(audit: PsiAudit) {
  return (
    [audit.displayValue, audit.explanation, audit.description].find(Boolean)?.replaceAll(/\s+/g, ' ').trim() ?? null
  )
}

function formatFieldMetricValue(metricKey: string, percentile: number | undefined) {
  if (percentile === undefined) {
    return 'n/a'
  }

  if (metricKey === 'CUMULATIVE_LAYOUT_SHIFT_SCORE') {
    const rawValue = percentile > 1 ? percentile / 100 : percentile

    return formatNumeric(rawValue, 2)
  }

  if (
    metricKey.endsWith('_MS') ||
    metricKey === 'EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT' ||
    metricKey === 'INTERACTION_TO_NEXT_PAINT'
  ) {
    return formatMilliseconds(percentile)
  }

  return formatNumeric(percentile)
}

function getMetricLabel(metricKey: string) {
  return FIELD_METRIC_LABELS[metricKey] ?? metricKey.toLowerCase().replaceAll('_', ' ')
}

function formatLoadingExperience(name: string, loadingExperience: PsiLoadingExperience | undefined) {
  if (!loadingExperience) {
    return []
  }

  const metricEntries = Object.entries(loadingExperience.metrics ?? {}).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  )

  const lines = [
    `${name}: ${normalizeCategory(loadingExperience.overall_category)}`,
    ...metricEntries.map(([metricKey, metricValue]) => {
      const category = normalizeCategory(metricValue.category)
      const label = getMetricLabel(metricKey)
      const value = formatFieldMetricValue(metricKey, metricValue.percentile)

      return `- ${label}: ${value} (${category})`
    }),
  ]

  return lines
}

function getOpportunities(result: PsiLighthouseResult | undefined) {
  return Object.entries(result?.audits ?? {})
    .flatMap(([id, audit]) => {
      if (audit.details?.type !== 'opportunity') {
        return []
      }

      const savingsMs = audit.details.overallSavingsMs ?? 0

      if (savingsMs <= 0) {
        return []
      }

      return [
        {
          displayValue: audit.displayValue ?? formatMilliseconds(savingsMs),
          id,
          savingsMs,
          title: audit.title ?? id,
        } satisfies Opportunity,
      ]
    })
    .sort((left, right) => {
      if (right.savingsMs !== left.savingsMs) {
        return right.savingsMs - left.savingsMs
      }

      return left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
    })
}

function getActionableAudits(result: PsiLighthouseResult | undefined, opportunities: Opportunity[]) {
  const opportunityIds = new Set(opportunities.map((opportunity) => opportunity.id))
  const seenAuditIds = new Set<string>()

  return CATEGORIES.flatMap((category) => {
    const auditRefs = result?.categories?.[category]?.auditRefs ?? []

    return auditRefs
      .flatMap((auditRef) => {
        const audit = result?.audits?.[auditRef.id]

        if (!audit || seenAuditIds.has(auditRef.id) || opportunityIds.has(auditRef.id)) {
          return []
        }

        if (NON_ACTIONABLE_SCORE_DISPLAY_MODES.has(audit.scoreDisplayMode ?? '')) {
          return []
        }

        if (audit.score === null || audit.score === undefined || audit.score >= 1) {
          return []
        }

        seenAuditIds.add(auditRef.id)

        return [
          {
            category,
            displayValue: formatAuditContext(audit),
            id: auditRef.id,
            score: audit.score,
            title: audit.title ?? auditRef.id,
          } satisfies ActionableAudit,
        ]
      })
      .sort((left, right) => {
        if (left.score !== right.score) {
          return left.score - right.score
        }

        return left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
      })
  })
}

function buildPsiUrl(url: string, strategy: Strategy, apiKey: string) {
  const endpoint = new URL(API_ENDPOINT)

  endpoint.searchParams.set('key', apiKey)
  endpoint.searchParams.set('strategy', strategy)
  endpoint.searchParams.set('url', url)

  for (const category of CATEGORIES) {
    endpoint.searchParams.append('category', category)
  }

  return endpoint
}

function formatReport(response: PsiResponse, strategy: Strategy) {
  const result = response.lighthouseResult

  if (!result) {
    exitWithError('PageSpeed Insights response did not include a lighthouseResult payload.')
  }

  const categoryLines = CATEGORIES.map((category) => {
    const score = formatScore(result.categories?.[category]?.score)

    return `- ${category}: ${score}`
  })
  const loadingExperienceLines = [
    ...formatLoadingExperience('Page field data', response.loadingExperience),
    ...formatLoadingExperience('Origin field data', response.originLoadingExperience),
  ]
  const opportunities = getOpportunities(result)
  const actionableAudits = getActionableAudits(result, opportunities)
  const warningLines = [...(result.runWarnings ?? [])].sort((left, right) => left.localeCompare(right))

  const lines = [
    'PageSpeed Insights',
    `Requested URL: ${result.requestedUrl ?? 'n/a'}`,
    `Final URL: ${result.finalUrl ?? 'n/a'}`,
    `Fetch time: ${result.fetchTime ?? 'n/a'}`,
    `Strategy: ${result.configSettings?.emulatedFormFactor ?? strategy}`,
    '',
    'Scores:',
    ...categoryLines,
  ]

  if (loadingExperienceLines.length > 0) {
    lines.push('', 'Field data:', ...loadingExperienceLines)
  }

  lines.push('', 'Actionable audits:')

  if (actionableAudits.length === 0) {
    lines.push('- none')
  } else {
    lines.push(
      ...actionableAudits.map((audit) => {
        const score = formatScore(audit.score)

        return `- ${audit.category}: ${audit.title}${audit.displayValue ? ` (${audit.displayValue}; score ${score})` : ` (score ${score})`}`
      }),
    )
  }

  lines.push('', 'Top opportunities:')

  if (opportunities.length === 0) {
    lines.push('- none')
  } else {
    lines.push(...opportunities.map((opportunity) => `- ${opportunity.title}: ${opportunity.displayValue}`))
  }

  if (warningLines.length > 0) {
    lines.push('', 'Warnings:', ...warningLines.map((warning) => `- ${warning}`))
  }

  if (result.runtimeError) {
    lines.push(
      '',
      'Runtime error:',
      `- ${result.runtimeError.code ?? 'unknown'}: ${result.runtimeError.message ?? 'Unknown runtime error.'}`,
    )
  }

  return lines.join('\n')
}

function parsePsiResponse(rawText: string) {
  try {
    return JSON.parse(rawText) as PsiResponse
  } catch {
    exitWithError('PageSpeed Insights returned a non-JSON response.')
  }
}

function getPsiErrorMessage(response: PsiResponse, statusCode: number) {
  const error = response.error

  if (!error) {
    return `PageSpeed Insights request failed with HTTP ${statusCode}.`
  }

  const detail = error.errors?.[0]
  const parts = [
    `PageSpeed Insights request failed with HTTP ${statusCode}.`,
    error.status ? `Status: ${error.status}` : null,
    error.message ? `Message: ${error.message}` : null,
    detail?.reason ? `Reason: ${detail.reason}` : null,
  ].filter(Boolean)

  return parts.join('\n')
}

async function fetchPageSpeed(url: string, strategy: Strategy, apiKey: string) {
  const endpoint = buildPsiUrl(url, strategy, apiKey)
  const timeoutMs = 30_000
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response

  try {
    response = await fetch(endpoint, {
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      exitWithError(`PageSpeed Insights request timed out after ${timeoutMs}ms.`)
    }

    const message = error instanceof Error ? error.message : String(error)

    exitWithError(`Failed to fetch PageSpeed Insights.\n${message}`)
  } finally {
    clearTimeout(timeoutHandle)
  }

  const rawText = await response.text()
  const payload = parsePsiResponse(rawText)

  if (!response.ok || payload.error) {
    exitWithError(getPsiErrorMessage(payload, response.status))
  }

  return payload
}

async function main() {
  const arguments_ = parseArguments(Bun.argv.slice(2))
  const apiKey = process.env.PAGESPEED_API_KEY?.trim()

  if (!apiKey) {
    exitWithError(
      [
        'Missing PAGESPEED_API_KEY.',
        'Set it before running the script, for example:',
        'PAGESPEED_API_KEY=your-key bun run ./scripts/pagespeed.ts https://tokengator.app',
      ].join('\n'),
    )
  }

  const response = await fetchPageSpeed(arguments_.url, arguments_.strategy, apiKey)

  if (arguments_.json) {
    console.log(JSON.stringify(response, null, 2))
    return
  }

  console.log(formatReport(response, arguments_.strategy))
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)

  exitWithError(message)
})
