import type { FormEvent } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'
import { Button } from '@tokengator/ui/components/button'
import { Input } from '@tokengator/ui/components/input'
import { Label } from '@tokengator/ui/components/label'

import { authClient } from '@/lib/auth-client'

import Loader from './loader'
import { SolanaAuthActions } from './solana-auth-actions'

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const navigate = useNavigate({
    from: '/',
  })
  const { isPending } = authClient.useSession()
  const [isDiscordPending, setIsDiscordPending] = useState(false)

  async function handleDiscordSignIn() {
    const callbackURL = `${window.location.origin}/onboard`

    setIsDiscordPending(true)

    try {
      await authClient.signIn.social({
        callbackURL,
        errorCallbackURL: `${window.location.origin}/login`,
        newUserCallbackURL: callbackURL,
        provider: 'discord',
      })
    } catch (error) {
      setIsDiscordPending(false)
      toast.error(error instanceof Error ? error.message : 'Unable to sign in with Discord')
    }
  }

  const form = useForm({
    defaultValues: {
      email: '',
      name: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          name: value.name,
          password: value.password,
        },
        {
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText)
          },
          onSuccess: () => {
            navigate({
              to: '/onboard',
            })
            toast.success('Sign up successful')
          },
        },
      )
    },
    validators: {
      onSubmit: z.object({
        email: z.email('Invalid email address'),
        name: z.string().min(2, 'Name must be at least 2 characters'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
      }),
    },
  })

  if (isPending) {
    return <Loader />
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-6 text-center text-3xl font-bold">Create Account</h1>

      <form
        className="space-y-4"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
      >
        <div>
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="email"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="password"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
          {({ canSubmit, isSubmitting }) => (
            <Button className="w-full" disabled={!canSubmit || isSubmitting} type="submit">
              {isSubmitting ? 'Submitting...' : 'Sign Up'}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="my-6 flex items-center gap-2">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <div className="bg-border h-px flex-1" />
      </div>

      <Button
        className="w-full"
        disabled={isDiscordPending}
        onClick={() => void handleDiscordSignIn()}
        type="button"
        variant="outline"
      >
        {isDiscordPending ? 'Redirecting to Discord...' : 'Sign Up with Discord'}
      </Button>
      <SolanaAuthActions
        action="verify"
        onSuccess={() => {
          navigate({
            to: '/onboard',
          })
          toast.success('Sign up successful')
        }}
      />

      <div className="mt-4 text-center">
        <Button className="text-indigo-600 hover:text-indigo-800" onClick={onSwitchToSignIn} variant="link">
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  )
}
