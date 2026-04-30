import { useCallback } from "react";
import { useData } from "@my-apps/contexts";
import { DateTime } from "luxon";

const TIMEZONE = "America/New_York";

const ERIC_USER_ID  = "LCqH5hKx2bP8Q5gDGPmzRd65PB32";
const JACK_USER_ID  = "ObqbPOKgzwYr2SmlN8UQOaDbkzE2";
const ELLIE_USER_ID = "CjW9bPGIjrgEqkjE9HxNF6xuxfA3";

const PEOPLE = [
  { id: ERIC_USER_ID,  person: "Me",    todoTitle: "To Do"       },
  { id: JACK_USER_ID,  person: "Jack",  todoTitle: "Jack To Do"  },
  { id: ELLIE_USER_ID, person: "Ellie", todoTitle: "Ellie To Do" },
];

// ---------------------------------------------------------------------------
// useScheduleTodayData
//
// Returns a callback that builds the full JSON payload for updateTodos.
// The payload includes eventId + monthKey so the Cloud Function can do a
// direct write with no searching.  Copy it, hand it to Claude Voice Chat,
// get back the edited version, paste into the Submit box, hit Submit.
// ---------------------------------------------------------------------------
export const useScheduleTodayData = () => {
  const { getActivitiesForEntity } = useData();

  const getData = useCallback(() => {
    const todayISO = DateTime.now().setZone(TIMEZONE).toISODate();
    const date  = DateTime.fromISO(todayISO, { zone: TIMEZONE });
    const start = date.startOf("day");
    const end   = date.endOf("day");

    const todos = PEOPLE.map(({ id, person, todoTitle }) => {
      const all = getActivitiesForEntity(id);

      // Find today's To Do event
      const todayToDo = all.find((item) => {
        if (!item.startTime) return false;
        const s = DateTime.fromISO(item.startTime);
        return (
          s >= start &&
          s <= end &&
          (item.title || "").trim().toLowerCase() === todoTitle.toLowerCase()
        );
      });

      const monthKey = todayToDo
        ? DateTime.fromISO(todayToDo.startTime).toFormat("yyyy-LL")
        : date.toFormat("yyyy-LL");

      const checklistActivity = todayToDo?.activities?.find(
        (a) => a.activityType === "checklist"
      );

      const items = (checklistActivity?.items || []).map((i) => ({
        id:        i.id,
        name:      i.name,
        completed: i.completed,
        ...(i.itemType && i.itemType !== "checkbox" ? { itemType: i.itemType } : {}),
      }));

      return {
        person,
        userId:    id,
        todoTitle,
        eventId:   todayToDo?.eventId  ?? null,
        monthKey,
        items,
      };
    });

    const payload = {
      action: "updateTodos",
      date:   todayISO,
      todos,
    };

    return JSON.stringify(payload, null, 2);
  }, [getActivitiesForEntity]);

  return getData;
};
