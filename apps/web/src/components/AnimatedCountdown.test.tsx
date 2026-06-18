import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { AnimatedCountdown } from './AnimatedCountdown';

describe('AnimatedCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the remaining time', () => {
    const finishesAt = new Date(Date.now() + 125_000).toISOString();
    render(<AnimatedCountdown finishesAt={finishesAt} />);
    expect(screen.getByText('00:02:05')).toBeInTheDocument();
  });

  it('calls onDone when finished', () => {
    const onDone = jest.fn();
    const finishesAt = new Date(Date.now() + 1000).toISOString();
    render(<AnimatedCountdown finishesAt={finishesAt} onDone={onDone} />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onDone).toHaveBeenCalled();
  });
});
