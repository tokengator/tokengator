import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Checkbox } from '@tokengator/ui/components/checkbox'
import { Input } from '@tokengator/ui/components/input'

import { useOrganizationListMine } from '@/features/organization/data-access/use-organization-list-mine'
import { requireCompletedOnboarding } from '@/features/organization/feature/organization-feature-active-access'
import { getOnboardingStatus } from '@/functions/get-onboarding-status'
import { getUser } from '@/functions/get-user'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/todos')({
  beforeLoad: async () => {
    const session = await getUser()
    const onboardingStatus = session ? await getOnboardingStatus() : null

    requireCompletedOnboarding({
      onboardingStatus,
      session,
    })

    return { session }
  },
  component: TodosRoute,
})

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useState('')

  const queryClient = useQueryClient()
  const organizations = useOrganizationListMine()
  const todos = useQuery(orpc.todo.getAll.queryOptions())
  const createMutation = useMutation(
    orpc.todo.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.todo.getAll.key(),
        })
        setNewTodoText('')
      },
    }),
  )
  const toggleMutation = useMutation(
    orpc.todo.toggle.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.todo.getAll.key(),
        })
      },
    }),
  )
  const deleteMutation = useMutation(
    orpc.todo.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.todo.getAll.key(),
        })
      },
    }),
  )
  const activeOrganization = organizations.data?.organizations.find((organization) => organization.isActive) ?? null
  const hasOrganizations = (organizations.data?.organizations.length ?? 0) > 0
  const isManagingTodos = Boolean(activeOrganization)

  const handleAddTodo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isManagingTodos && newTodoText.trim()) {
      createMutation.mutate({ text: newTodoText })
    }
  }

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleMutation.mutate({ completed, id })
  }

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id })
  }

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>Manage tasks for the active community.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="mb-6 flex items-center space-x-2" onSubmit={handleAddTodo}>
            <Input
              disabled={createMutation.isPending || !isManagingTodos}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new task..."
              value={newTodoText}
            />
            <Button disabled={createMutation.isPending || !isManagingTodos || !newTodoText.trim()} type="submit">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
            </Button>
          </form>

          {organizations.isError ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              We couldn&apos;t load your communities right now.
            </p>
          ) : organizations.isPending ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !hasOrganizations && !organizations.isPending ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Join or create a community to start managing todos.
            </p>
          ) : !activeOrganization ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Select a community from the header to view and manage its todos.
            </p>
          ) : todos.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : todos.data?.length === 0 ? (
            <p className="py-4 text-center">No todos yet. Add one above!</p>
          ) : (
            <ul className="space-y-2">
              {todos.data?.map((todo) => (
                <li className="flex items-center justify-between rounded-md border p-2" key={todo.id}>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={todo.completed}
                      id={`todo-${todo.id}`}
                      onCheckedChange={(checked) => {
                        if (typeof checked === 'boolean') {
                          handleToggleTodo(todo.id, checked)
                        }
                      }}
                    />
                    <label className={`${todo.completed ? 'line-through' : ''}`} htmlFor={`todo-${todo.id}`}>
                      {todo.text}
                    </label>
                  </div>
                  <Button
                    aria-label="Delete todo"
                    onClick={() => handleDeleteTodo(todo.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
