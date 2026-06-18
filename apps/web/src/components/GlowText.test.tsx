import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import GlowText from './GlowText';

describe('GlowText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders children', () => {
    render(<GlowText>Hello</GlowText>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('types text gradually', () => {
    render(
      <GlowText typing typingSpeed={10}>
        Arbor
      </GlowText>,
    );
    const elements = screen.queryAllByText('');
    expect(elements.length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(60);
    });

    expect(screen.getByText('Arbor')).toBeInTheDocument();
  });
});
