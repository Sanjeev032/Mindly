import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { FaArrowLeft, FaDatabase } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function SupabaseTodos() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function getTodos() {
      setLoading(true);
      const { data: todos, error } = await supabase.from('todos').select();

      if (error) {
        console.error('Supabase Error:', error);
      } else if (todos) {
        setTodos(todos);
      }
      setLoading(false);
    }

    getTodos();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate('/dashboard')}
          className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <FaArrowLeft /> Back to Dashboard
        </button>

        <div className="glass-panel p-8 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <FaDatabase className="text-blue-400 text-2xl" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Supabase Playground
            </h1>
          </div>

          <p className="text-gray-400 mb-8 border-b border-white/5 pb-4">
            This page demonstrates a direct client-side integration with Supabase, querying the <code>todos</code> table.
          </p>

          {loading ? (
            <div className="animate-pulse text-gray-500">Querying Supabase...</div>
          ) : todos.length === 0 ? (
            <div className="text-gray-500 italic">No todos found in the 'todos' table.</div>
          ) : (
            <ul className="space-y-3">
              {todos.map((todo) => (
                <li key={todo.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <span>{todo.name}</span>
                  <span className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">{todo.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
