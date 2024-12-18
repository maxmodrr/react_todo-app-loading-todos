/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { UserWarning } from './UserWarning';
import {
  addTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  USER_ID,
} from './api/todos';
import { Todo } from './types/Todo';
import { getCompletedTodos } from './utils/methods';
import { TodoList } from './components/TodoList';
import classNames from 'classnames';
import { FILTER_BY } from './constants/constants';

function filterTodos(todos: Todo[], filterBy: string) {
  const copy = [...todos];

  switch (filterBy) {
    case FILTER_BY.ALL:
      return copy;
    case FILTER_BY.ACTIVE:
      return copy.filter(e => !e.completed);
    case FILTER_BY.COMPLETED:
      return copy.filter(e => e.completed);
  }

  return [];
}

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filterBy, setFilterBy] = useState(FILTER_BY.ALL);
  const errorDiv = useRef<HTMLDivElement | null>(null);
  const timerId = useRef(0);

  const filteredTodos = filterTodos(todos, filterBy);

  useEffect(() => {
    if (errorDiv.current && errorMessage) {
      errorDiv.current.classList.remove('hidden');
      timerId.current = window.setTimeout(() => {
        errorDiv.current?.classList.add('hidden');
        setErrorMessage('');
      }, 2000);
    }
  }, [errorMessage]);

  useEffect(() => {
    getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'));
  }, []);

  if (!USER_ID) {
    return <UserWarning />;
  }

  const hasSomeErrors = () => {
    if (!title) {
      setErrorMessage('Title should not be empty');

      return true;
    }

    return false;
  };

  const handleChangeQuery = (e: ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!hasSomeErrors()) {
      const newTodo = {
        title,
        userId: USER_ID,
        completed: false,
      };

      addTodo(newTodo)
        .then(newPost => {
          setTodos(prev => [...prev, newPost]);
        })
        .catch(() => setErrorMessage('Unable to add todo'));
      setTitle('');
    }
  };

  const closeError = () => {
    window.clearTimeout(timerId.current);
    errorDiv.current?.classList.add('hidden');
  };

  const sizeItemsLeft = () => todos.length - getCompletedTodos(todos).length;

  const handleUpdateCompleted = (todo: Todo) => {
    const updatedTodo = {
      id: todo.id,
      completed: todo.completed,
    };

    updateTodo(updatedTodo)
      .then(response => {
        setTodos(prev => {
          return prev.map(e =>
            e.id === response.id ? { ...e, ...response } : e,
          );
        });
      })
      .catch(() => setErrorMessage('Unable to update todo'));
  };

  const handleDeleteTodo = (id: number) => {
    deleteTodo(id).catch(() => {
      setErrorMessage('Unable to delete todo');
    });
    setTodos(prev => {
      const copy = [...prev];
      const index = copy.findIndex(e => e.id === id);

      copy.splice(index, 1);

      return copy;
    });
  };

  const changeAllCompleted = async () => {
    const shouldCompleteAll =
      getCompletedTodos(todos).length === 0 || sizeItemsLeft() > 0;

    try {
      const updatedTodos = await Promise.all(
        todos.map(async e => {
          const updatedTodo = await updateTodo({
            id: e.id,
            completed: shouldCompleteAll,
          });

          return {
            ...e,
            completed: updatedTodo.completed,
          };
        }),
      );

      setTodos(updatedTodos);
    } catch {
      setErrorMessage('Unable to update todo');
    }
  };

  const clearCompleted = () => {
    setTodos(prev => {
      return prev.map(elem => {
        const currentElem = elem;

        if (currentElem.completed) {
          updateTodo({ id: elem.id, completed: false });
          currentElem.completed = false;
        }

        return currentElem;
      });
    });
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          {todos.length > 0 && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: sizeItemsLeft() === 0,
              })}
              // className="todoapp__toggle-all active"
              data-cy="ToggleAllButton"
              onClick={() => changeAllCompleted()}
            />
          )}

          {/* Add a todo on form submit */}
          <form onSubmit={handleSubmit} method="POST" action="">
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              autoFocus
              value={title}
              onChange={handleChangeQuery}
            />
          </form>
        </header>

        {filteredTodos.length > 0 && (
          <TodoList
            todos={filteredTodos}
            onUpdate={handleUpdateCompleted}
            onDelete={handleDeleteTodo}
          />
        )}

        {/* Hide the footer if there are no todos */}
        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {`${sizeItemsLeft()} items left`}
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={classNames('filter__link', {
                  selected: filterBy === FILTER_BY.ALL,
                })}
                data-cy="FilterLinkAll"
                onClick={() => setFilterBy(FILTER_BY.ALL)}
              >
                All
              </a>

              <a
                href="#/active"
                className={classNames('filter__link', {
                  selected: filterBy === FILTER_BY.ACTIVE,
                })}
                data-cy="FilterLinkActive"
                onClick={() => setFilterBy(FILTER_BY.ACTIVE)}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={classNames('filter__link', {
                  selected: filterBy === FILTER_BY.COMPLETED,
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilterBy(FILTER_BY.COMPLETED)}
              >
                Completed
              </a>
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={getCompletedTodos(todos).length === 0}
              onClick={() => clearCompleted()}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        ref={errorDiv}
        data-cy="ErrorNotification"
        className="notification
        is-danger is-light has-text-weight-normal hidden"
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={closeError}
        />
        {/* show only one message at a time */}
        {errorMessage}
      </div>
    </div>
  );
};
