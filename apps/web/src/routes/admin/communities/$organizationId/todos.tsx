import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Checkbox } from '@tokengator/ui/components/checkbox'
import { Input } from '@tokengator/ui/components/input'

import { orpc } from '@/utils/orpc'

function getAdminTodoListQueryOptions(organizationId: string) {
  return orpc.adminTodo.list.queryOptions({
    input: {
      organizationId,
    },
  })
}

export const Route = createFileRoute('/admin/communities/$organizationId/todos')({
  component: RouteComponent,
})

function RouteComponent() {
  const queryClient = useQueryClient()
  const { organizationId } = Route.useParams()
  const [newTodoText, setNewTodoText] = useState('')
  const todos = useQuery(getAdminTodoListQueryOptions(organizationId))
  const createMutation = useMutation(
    orpc.adminTodo.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminTodo.list.key({
            input: {
              organizationId,
            },
          }),
        })
        setNewTodoText('')
      },
    }),
  )
  const deleteMutation = useMutation(
    orpc.adminTodo.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminTodo.list.key({
            input: {
              organizationId,
            },
          }),
        })
      },
    }),
  )
  const toggleMutation = useMutation(
    orpc.adminTodo.toggle.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminTodo.list.key({
            input: {
              organizationId,
            },
          }),
        })
      },
    }),
  )

  function handleAddTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!newTodoText.trim()) {
      return
    }

    createMutation.mutate({
      organizationId,
      text: newTodoText,
    })
  }

  function handleDeleteTodo(id: number) {
    deleteMutation.mutate({
      id,
      organizationId,
    })
  }

  function handleToggleTodo(id: number, completed: boolean) {
    toggleMutation.mutate({
      completed,
      id,
      organizationId,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todos</CardTitle>
        <CardDescription>Manage tasks for this community from the admin dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form className="flex items-center gap-2" onSubmit={handleAddTodo}>
          <Input
            disabled={createMutation.isPending}
            onChange={(event) => setNewTodoText(event.target.value)}
            placeholder="Add a new task..."
            value={newTodoText}
          />
          <Button disabled={createMutation.isPending || !newTodoText.trim()} type="submit">
            {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Add'}
          </Button>
        </form>

        {todos.isPending ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : todos.isError ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            We couldn&apos;t load this community&apos;s todos right now.
          </p>
        ) : todos.data.length === 0 ? (
          <p className="py-4 text-center">No todos yet. Add one above!</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todos.data.map((todo) => (
              <li className="flex items-center justify-between rounded-md border p-2" key={todo.id}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={todo.completed}
                    id={`admin-todo-${todo.id}`}
                    onCheckedChange={(checked) => {
                      if (typeof checked !== 'boolean') {
                        return
                      }

                      handleToggleTodo(todo.id, checked)
                    }}
                  />
                  <label className={todo.completed ? 'line-through' : undefined} htmlFor={`admin-todo-${todo.id}`}>
                    {todo.text}
                  </label>
                </div>
                <Button aria-label="Delete todo" onClick={() => handleDeleteTodo(todo.id)} size="icon" variant="ghost">
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
