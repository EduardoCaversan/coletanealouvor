import { beforeEach, describe, expect, it } from "vitest";
import { useApp } from "@/store/useApp";
import type { PassageRef } from "@/lib/types";

beforeEach(() => {
  useApp.setState({
    setlist: [],
    savedPlans: [],
    currentPlanId: null,
    planName: "",
    planDate: "",
    planDirty: false,
    undoSetlist: null,
    activeUid: null,
    hymnUid: null,
    passage: null,
  });
});

describe("saved service plans", () => {
  it("saves and restores ordered items with private notes", () => {
    useApp.getState().addLabelToSetlist("Abertura");
    let state = useApp.getState();
    state.setSetlistItemNote(state.setlist[0].uid, "Microfone 2");
    state.setPlanDetails("Culto Divino", "2026-09-26");
    expect(state.saveServicePlan()).toBe(true);

    state = useApp.getState();
    const planId = state.savedPlans[0].id;
    state.addLabelToSetlist("Sermão");
    expect(useApp.getState().planDirty).toBe(true);

    useApp.getState().loadServicePlan(planId);
    state = useApp.getState();
    expect(state.setlist).toHaveLength(1);
    expect(state.setlist[0]).toMatchObject({ type: "label", text: "Abertura", note: "Microfone 2" });
    expect(state.planDirty).toBe(false);
  });

  it("duplicates plans and supports one-step undo", () => {
    useApp.getState().addLabelToSetlist("Abertura");
    useApp.getState().setPlanDetails("Culto", "2026-09-26");
    useApp.getState().saveServicePlan();
    const planId = useApp.getState().savedPlans[0].id;

    useApp.getState().duplicateServicePlan(planId);
    expect(useApp.getState().savedPlans).toHaveLength(2);
    expect(useApp.getState().savedPlans[0].name).toContain("cópia");

    useApp.getState().addLabelToSetlist("Encerramento");
    useApp.getState().undoSetlistChange();
    expect(useApp.getState().setlist).toHaveLength(1);
  });

  it("strips extra private fields before a passage can become Live", () => {
    const passageWithNote = {
      book: "jo",
      chapter: 3,
      verseStart: 16,
      verseEnd: 16,
      note: "NÃO EXIBIR",
    } as PassageRef & { note: string };
    useApp.getState().openPassage(passageWithNote);

    expect(useApp.getState().passage).toEqual({ book: "jo", chapter: 3, verseStart: 16, verseEnd: 16 });
    expect(useApp.getState().passage).not.toHaveProperty("note");
  });
});
