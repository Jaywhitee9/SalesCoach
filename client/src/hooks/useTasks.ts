import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DashboardTask } from '../../types';

export const useTasks = (organizationId?: string, userId?: string) => {
    const [tasks, setTasks] = useState<DashboardTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('tasks')
                .select(`
                    *,
                    type,
                    priority,
                    owner_id,
                    lead:lead_id (
                        id,
                        name
                    )
                `)
                .order('due_date', { ascending: true });

            if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }

            if (userId) {
                query = query.eq('owner_id', userId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Transform DB data to UI Task Type
            const formattedTasks: DashboardTask[] = (data || []).map((dbTask: any) => {
                let formattedDate = '';
                try {
                    formattedDate = new Date(dbTask.due_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                } catch (e) {
                    formattedDate = '12:00';
                }

                return {
                    id: dbTask.id,
                    title: dbTask.title,
                    leadName: dbTask.lead?.name || 'כללי', // Fallback if no lead
                    dueDate: formattedDate, // Keeping this for backward compat if needed, but UI uses rawDate mostly
                    dueTime: dbTask.due_time ? dbTask.due_time.substring(0, 5) : '10:00', // HH:MM
                    rawDate: dbTask.due_date, // Export raw ISO string
                    completed: dbTask.completed,
                    type: dbTask.type,
                    priority: dbTask.priority,
                    ai_reason: dbTask.ai_reason,
                    ownerId: dbTask.owner_id
                };
            });

            setTasks(formattedTasks);
        } catch (err: any) {
            console.error('Error fetching tasks:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleTask = async (taskId: string, currentStatus?: boolean) => {
        // Optimistic Update - update UI immediately
        const newStatus = currentStatus !== undefined ? !currentStatus : true;
        setTasks(prev => prev.map(t =>
            t.id === taskId
                ? { ...t, completed: newStatus }
                : t
        ));

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ completed: newStatus })
                .eq('id', taskId);

            if (error) {
                // Revert on error
                console.error('Error toggling task:', error);
                setTasks(prev => prev.map(t =>
                    t.id === taskId
                        ? { ...t, completed: !newStatus }
                        : t
                ));
            }
        } catch (err) {
            console.error('Error toggling task:', err);
            // Revert on error
            setTasks(prev => prev.map(t =>
                t.id === taskId
                    ? { ...t, completed: !newStatus }
                    : t
            ));
        }
    };

    const addTask = async (title: string, leadId?: string, dueDate?: Date) => {
        try {
            // Check Auth (User & Session)
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            // Fallback: Check Session if getUser fails (sometimes happens with stale tokens)
            let activeUser = user;
            if (!activeUser) {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (session?.user) {
                    console.log('Recovered user from session:', session.user.id);
                    activeUser = session.user;
                } else {
                    console.error('Auth Check Failed:', { userError, sessionError });
                }
            }

            if (!activeUser) throw new Error('No user logged in. Please refresh or log in again.');

            console.log('Adding task for user:', activeUser.id, { title, leadId, dueDate });

            // Proceed with Insert
            const { error, data } = await supabase
                .from('tasks')
                .insert({
                    title,
                    lead_id: leadId,
                    due_date: dueDate || new Date(),
                    owner_id: activeUser.id,
                    completed: false
                    // organization_id is AUTO-ASSIGNED by Trigger. We DO NOT send it.
                })
                .select();

            if (data) console.log('Task added successfully:', data);
            if (error) {
                console.error('Supabase Error adding task:', error);
                throw error;
            }
            fetchTasks();
        } catch (err) {
            console.error('Error adding task:', err);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [organizationId, userId]);

    return { tasks, loading, error, toggleTask, addTask, refreshTasks: fetchTasks };
};
