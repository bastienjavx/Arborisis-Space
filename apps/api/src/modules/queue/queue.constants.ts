export const CONSTRUCTION_QUEUE = 'construction';
export const RESEARCH_QUEUE = 'research';
export const COLONIZATION_QUEUE = 'colonization';

export const FINALIZE_JOB = 'finalize';

/** Données portées par un job de file : l'identifiant du job métier à finaliser. */
export interface FinalizeJobData {
  jobId: string;
}
