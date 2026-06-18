import { render, screen } from '@testing-library/react';
import { AnimatedCounter } from './AnimatedCounter';

describe('AnimatedCounter', () => {
  it('renders a numeric value', async () => {
    render(<AnimatedCounter value={1234} />);
    const element = await screen.findByText((content) => /\d/.test(content));
    expect(element).toBeInTheDocument();
  });
});
