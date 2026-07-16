import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EVENTS_KEY, listEvents, getEvent, createEvent, updateEvent, deleteEvent, type EventInput,
  EVENT_REGS_KEY, listEventRegistrations, updateEventRegistration,
} from "../services/events";

export const useEvents = (search: string) =>
  useQuery({ queryKey: [EVENTS_KEY, search], queryFn: () => listEvents(search || undefined) });
export const useEvent = (id: string) =>
  useQuery({ queryKey: [EVENTS_KEY, id], queryFn: () => getEvent(id), enabled: !!id });

export const useEventMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [EVENTS_KEY] });
  return {
    create: useMutation({ mutationFn: (d: Partial<EventInput>) => createEvent(d), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<EventInput> }) => updateEvent(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteEvent(id), onSuccess: invalidate }),
  };
};

export const useEventRegistrations = () =>
  useQuery({ queryKey: [EVENT_REGS_KEY], queryFn: listEventRegistrations });
export const useEventRegMutations = () => {
  const qc = useQueryClient();
  return {
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) => updateEventRegistration(id, status),
      onSuccess: () => qc.invalidateQueries({ queryKey: [EVENT_REGS_KEY] }),
    }),
  };
};
