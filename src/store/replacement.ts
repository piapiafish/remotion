import { create } from 'zustand'

/** UI-only continuation; never serialized into a Project. */
export const useReplacement = create<{
  pending: {kind:'open'|'new'; proceed:()=>void}|null
}>(()=>({pending:null}))
