import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { QuestView, QuestsOverview } from '@arborisis/shared';
import { QuestTracker } from './QuestTracker';

const mutate = jest.fn();
const toast = jest.fn();
let questsData: QuestsOverview | undefined;

jest.mock('@/lib/queries', () => ({
  useQuests: () => ({ data: questsData }),
  useClaimQuest: () => ({ mutate, isPending: false }),
}));

jest.mock('./ToastProvider', () => ({
  useToast: () => toast,
}));

function quest(overrides: Partial<QuestView> = {}): QuestView {
  return {
    id: 'first-build',
    name: 'Premier bourgeon',
    description: 'Améliore un bâtiment.',
    order: 1,
    chapter: 'Éveil',
    ctaHref: '/buildings',
    ctaLabel: 'Faire pousser',
    reward: {},
    progress: 0,
    target: 1,
    completed: false,
    claimedAt: null,
    ...overrides,
  };
}

function overview(active: QuestView): QuestsOverview {
  return {
    active,
    quests: [active, quest({ id: 'sap-2', order: 2 })],
    claimableCount: active.completed && !active.claimedAt ? 1 : 0,
  };
}

describe('QuestTracker', () => {
  beforeEach(() => {
    mutate.mockClear();
    toast.mockClear();
    questsData = undefined;
  });

  it('affiche le guide, le chapitre et le CTA de la quête active', () => {
    questsData = overview(quest());

    render(<QuestTracker />);

    expect(screen.getByRole('heading', { name: /Guide de croissance/i })).toBeInTheDocument();
    expect(screen.getByText(/Éveil · étape 1 \/ 2/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Faire pousser/i })).toHaveAttribute(
      'href',
      '/buildings',
    );
  });

  it("n'affiche pas de CTA quand la quête n'en fournit pas", () => {
    questsData = overview(quest({ ctaHref: undefined, ctaLabel: undefined }));

    render(<QuestTracker />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('conserve le bouton de réclamation pour une quête terminée', () => {
    questsData = overview(quest({ completed: true, progress: 1 }));

    render(<QuestTracker />);
    fireEvent.click(screen.getByRole('button', { name: /Réclamer/i }));

    expect(mutate).toHaveBeenCalledWith({ questId: 'first-build' }, expect.any(Object));
  });
});
